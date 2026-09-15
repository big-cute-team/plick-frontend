/**
 * 로컬 검증용 채팅 목 서버. Confluence [API 명세] 라이브 경기 채팅(59146245)대로 동작한다.
 *  - GET /ws/chat?matchId=&token=  핸드셰이크: matchId 없으면 400, token 없으면 401,
 *    matchId=900001(종료 경기)는 404, 그 밖엔 통과
 *  - 입장 직후 최근 20개 한 프레임, 이후 100ms 창으로 묶어 배열 프레임
 *  - {"content":""} → ERROR EMPTY_MESSAGE, 200자 초과 → ERROR MESSAGE_TOO_LONG
 *  - 전송 한도(KAN-464): 접속 하나가 5초 흐르는 창에 5건까지. 넘으면 방에 안 뿌리고
 *    ERROR RATE_LIMITED를 한 번만 돌려준다(다시 통과할 때까지). 무효 메시지도 센다.
 *    env RATE_LIMIT_MESSAGES / RATE_LIMIT_WINDOW_MS로 바꿀 수 있다
 *  - POST /kick?retry=ms  전원 4000 "retry=<ms>"로 끊기 (배포 시뮬레이션)
 *  - POST /seed?n=25      서버가 스스로 n개 메시지를 방에 뿌림 (입장 지급·자동 스크롤 확인)
 */
import http from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT ?? 8090);
const RATE_LIMIT_MESSAGES = Number(process.env.RATE_LIMIT_MESSAGES ?? 5);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 5000);

/** BE ChatSendQuota와 같은 흐르는 창. 통과한 전송 시각만 들고 있다가 지난 것부터 버린다. */
function quota() {
  const sentAt = [];
  let notified = false;
  return {
    tryAcquire(now) {
      while (sentAt.length > 0 && now - sentAt[0] >= RATE_LIMIT_WINDOW_MS)
        sentAt.shift();
      if (sentAt.length >= RATE_LIMIT_MESSAGES) return false;
      sentAt.push(now);
      notified = false;
      return true;
    },
    shouldNotify() {
      if (notified) return false;
      notified = true;
      return true;
    },
  };
}
const rooms = new Map(); // matchId -> { clients:Set<ws>, recent:[], queue:[] }
let seq = 0;

function room(matchId) {
  let r = rooms.get(matchId);
  if (!r) {
    r = { clients: new Set(), recent: [], queue: [] };
    rooms.set(matchId, r);
  }
  return r;
}
function message(userId, nickname, content) {
  return {
    type: "MESSAGE",
    userId,
    nickname,
    content,
    sentAt: new Date().toISOString(),
  };
}
function push(matchId, msg) {
  const r = room(matchId);
  r.recent.push(msg);
  if (r.recent.length > 20) r.recent.shift();
  r.queue.push(msg);
}

setInterval(() => {
  for (const [matchId, r] of rooms) {
    if (r.queue.length === 0) continue;
    const frame = JSON.stringify(r.queue);
    r.queue = [];
    for (const c of r.clients) if (c.readyState === 1) c.send(frame);
  }
}, 100);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (req.method === "POST" && url.pathname === "/kick") {
    const retry = Number(url.searchParams.get("retry") ?? 3000);
    let n = 0;
    for (const r of rooms.values())
      for (const c of r.clients) {
        c.close(4000, `retry=${retry + Math.floor(Math.random() * 500)}`);
        n++;
      }
    res.end(`kicked ${n}\n`);
    return;
  }
  if (req.method === "POST" && url.pathname === "/seed") {
    const n = Number(url.searchParams.get("n") ?? 25);
    const matchId = url.searchParams.get("matchId") ?? "900002";
    for (let i = 0; i < n; i++)
      push(
        matchId,
        message(
          9000 + (i % 3),
          ["붉은악마", "리버풀콥", "구너"][i % 3],
          `시드 메시지 ${++seq}`,
        ),
      );
    res.end(`seeded ${n}\n`);
    return;
  }
  res.statusCode = 404;
  res.end();
});

const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, "http://x");
  const reject = (code, text) => {
    socket.write(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\n\r\n`);
    socket.destroy();
    console.log(`reject ${code} ${req.url}`);
  };
  if (url.pathname !== "/ws/chat") return reject(404, "Not Found");
  const matchId = url.searchParams.get("matchId");
  const token = url.searchParams.get("token");
  if (!matchId || !/^\d+$/.test(matchId)) return reject(400, "Bad Request");
  if (!token) return reject(401, "Unauthorized");
  if (matchId === "900001") return reject(404, "Not Found");
  wss.handleUpgrade(req, socket, head, (ws) => {
    ws.matchId = matchId;
    ws.userId = Number(url.searchParams.get("uid") ?? 1);
    ws.nickname = url.searchParams.get("nick") ?? "테스터";
    ws.quota = quota();
    const r = room(matchId);
    r.clients.add(ws);
    ws.send(JSON.stringify(r.recent));
    console.log(
      `join match=${matchId} clients=${r.clients.size} token=${token.slice(0, 8)}…`,
    );
    ws.on("message", (raw) => {
      let content = null;
      try {
        content = JSON.parse(raw.toString()).content ?? null;
      } catch {}
      const err = (reason) =>
        ws.send(
          JSON.stringify([
            {
              type: "ERROR",
              userId: null,
              nickname: null,
              content: reason,
              sentAt: new Date().toISOString(),
            },
          ]),
        );
      if (!ws.quota.tryAcquire(Date.now())) {
        console.log(`rate-limited match=${matchId} uid=${ws.userId}`);
        if (ws.quota.shouldNotify()) err("RATE_LIMITED");
        return;
      }
      if (content === null || String(content).trim() === "")
        return err("EMPTY_MESSAGE");
      if (String(content).length > 200) return err("MESSAGE_TOO_LONG");
      push(matchId, message(ws.userId, ws.nickname, String(content)));
    });
    ws.on("close", () => {
      r.clients.delete(ws);
      console.log(`leave match=${matchId} clients=${r.clients.size}`);
    });
  });
});

server.listen(PORT, () => console.log(`mock chat ws on :${PORT}`));
