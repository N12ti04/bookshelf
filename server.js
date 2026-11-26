// Bookshelf: a tiny full stack app with zero dependencies.
// Run with: node server.js

const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_FILE = path.join(__dirname, "data", "books.json");
const STATUSES = ["to-read", "reading", "finished"];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// ---------- storage (a JSON file; swap for a database later) ----------

async function readBooks() {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeBooks(books) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(books, null, 2));
}

// ---------- helpers ----------

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1e5) throw new HttpError(413, "Request body too large.");
  }
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function cleanText(value, field, max) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${field} is required.`);
  }
  return value.trim().slice(0, max);
}

// ---------- API ----------

async function handleApi(req, res, url) {
  const parts = url.pathname.split("/").filter(Boolean); // ["api", "books", ":id"]
  const id = parts[2];

  if (parts[1] !== "books" || parts.length > 3) {
    throw new HttpError(404, "Not found.");
  }

  // GET /api/books
  if (req.method === "GET" && !id) {
    return sendJson(res, 200, await readBooks());
  }

  // POST /api/books
  if (req.method === "POST" && !id) {
    const body = await readBody(req);
    const book = {
      id: crypto.randomUUID(),
      title: cleanText(body.title, "Title", 200),
      author: cleanText(body.author, "Author", 120),
      status: "to-read",
      createdAt: new Date().toISOString(),
    };
    const books = await readBooks();
    books.unshift(book);
    await writeBooks(books);
    return sendJson(res, 201, book);
  }

  // PATCH /api/books/:id
  if (req.method === "PATCH" && id) {
    const body = await readBody(req);
    if (!STATUSES.includes(body.status)) {
      throw new HttpError(400, `Status must be one of: ${STATUSES.join(", ")}.`);
    }
    const books = await readBooks();
    const book = books.find((b) => b.id === id);
    if (!book) throw new HttpError(404, "Book not found.");
    book.status = body.status;
    await writeBooks(books);
    return sendJson(res, 200, book);
  }

  // DELETE /api/books/:id
  if (req.method === "DELETE" && id) {
    const books = await readBooks();
    const next = books.filter((b) => b.id !== id);
    if (next.length === books.length) throw new HttpError(404, "Book not found.");
    await writeBooks(next);
    return sendJson(res, 204);
  }

  throw new HttpError(405, "Method not allowed.");
}

// ---------- static files ----------

async function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.join(PUBLIC_DIR, path.normalize(requested));

  // Block path traversal outside /public
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const type = MIME[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(file);
  } catch (err) {
    if (err.code === "ENOENT" || err.code === "EISDIR") {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
      return;
    }
    throw err;
  }
}

// ---------- server ----------

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
    } else {
      await serveStatic(req, res, url);
    }
  } catch (err) {
    if (err instanceof HttpError) {
      return sendJson(res, err.status, { error: err.message });
    }
    console.error(err);
    sendJson(res, 500, { error: "Something went wrong on the server." });
  }
});

server.listen(PORT, () => {
  console.log(`Bookshelf running at http://localhost:${PORT}`);
});
