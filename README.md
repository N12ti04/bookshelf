# Bookshelf

A small full stack app for tracking what you're reading. Books stand on three shelves (to read, reading now, finished). Click a spine to move it to another shelf or remove it.

- **Frontend:** plain HTML, CSS and JavaScript in `public/`
- **Backend:** Node's built-in `http` module in `server.js`, no dependencies
- **Storage:** a JSON file at `data/books.json`, created on first write

## Run it

You need Node 18 or newer.

```bash
git clone https://github.com/<your-username>/bookshelf.git
cd bookshelf
npm start
```

Open http://localhost:3000. Use `PORT=4000 npm start` to change the port, or `npm run dev` to restart automatically when you edit `server.js`.

## API

| Method | Path              | Body                  | Result                         |
| ------ | ----------------- | --------------------- | ------------------------------ |
| GET    | `/api/books`      |                       | List of books                  |
| POST   | `/api/books`      | `{ title, author }`   | The new book (201)             |
| PATCH  | `/api/books/:id`  | `{ status }`          | The updated book               |
| DELETE | `/api/books/:id`  |                       | Nothing (204)                  |

`status` is one of `to-read`, `reading` or `finished`.

## Project layout

```
bookshelf/
  server.js        API routes and static file server
  public/
    index.html     page structure
    style.css      styles
    app.js         fetches books and renders the shelves
  data/            where books.json is stored
```

## Ideas for next steps

- Replace the JSON file with SQLite or Postgres
- Add a rating or notes field to each book
- Add user accounts so each person has their own shelves
- Deploy to Render, Railway or Fly.io

## License

MIT
