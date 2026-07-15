# Postman Lite 🚀

A lightweight, browser-based API testing platform — a simplified alternative to Postman built with vanilla HTML, CSS, JavaScript and Node.js + Express.

---

## Features

- **HTTP Request Builder** — supports GET, POST, PUT, PATCH, DELETE, HEAD, and the new **QUERY** method
- **Query Parameters** — dynamically add/remove params with URL auto-sync
- **Header Management** — add custom headers (Content-Type, Authorization, Accept, etc.)
- **Request Body** — supports JSON (raw), plain text, XML, form-data, x-www-form-urlencoded
- **Authentication** — No Auth, Bearer Token, Basic Auth, API Key
- **Response Viewer** — body (Pretty/Raw/Preview), headers, timeline, status code, response time & size
- **JSON Syntax Highlighting** — automatically formats and colors JSON responses
- **Collections** — create, save, rename, duplicate, and delete request collections
- **Environment Variables** — define variables like `{{baseUrl}}` and switch between environments
- **Request History** — last 50 requests saved automatically
- **Multi-tab Interface** — open multiple requests simultaneously
- **No CORS Issues** — all requests are proxied through the Express backend

---

## Tech Stack

| Layer    | Technology            |
|----------|-----------------------|
| Frontend | HTML, CSS, JavaScript |
| Backend  | Node.js + Express.js  |
| Storage  | localStorage (no DB)  |
| HTTP     | Axios (server-side)   |

---

## Project Structure

```
postman-lite/
├── index.html        # Main UI
├── style.css         # All styles
├── app.js            # Frontend logic
├── index.js          # Express proxy server (backend)
├── package.json      # Backend dependencies
├── .gitignore
└── README.md
```

---

## Installation & Running

### Prerequisites
- Node.js (v16 or higher)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Start the server
node index.js
```

Then open your browser and go to:
```
http://localhost:5000
```

---

## How It Works

```
Browser (UI)
    |
    |  POST /api/proxy  { url, method, headers, body }
    v
Express Server (localhost:5000)
    |
    |  axios(config)  ---> Target API
    |                 <--- Response
    v
Browser receives response (no CORS issues)
```

The backend acts as a **reverse proxy** — the browser never directly calls the external API, so CORS restrictions do not apply.

---

## Usage

### Sending a Request
1. Select HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD, QUERY)
2. Enter the URL (supports `{{variable}}` syntax)
3. Add params, headers, body, or auth as needed
4. Click **Send** or press `Ctrl+Enter`

### Environment Variables
1. Click **Env** in the top navbar to create an environment
2. Add variables: `baseUrl = https://api.example.com`
3. Use in URL: `{{baseUrl}}/users`

### Collections
- Click **+** in Collections panel to create a collection
- Click **Save** on any request to save it
- Hover over a request and click the three dots to rename, duplicate, or delete

---

## Keyboard Shortcuts

| Shortcut     | Action       |
|--------------|--------------|
| Ctrl+Enter   | Send request |
| Ctrl+T       | New tab      |
| Ctrl+W       | Close tab    |
| Ctrl+S       | Save request |
| Ctrl+K       | Focus URL    |
| Esc          | Close modals |

---

## Sample Requests (Pre-loaded)

The app comes with a **Demo Collection** using [JSONPlaceholder](https://jsonplaceholder.typicode.com):

| Name          | Method | URL                                          |
|---------------|--------|----------------------------------------------|
| GET All Users | GET    | https://jsonplaceholder.typicode.com/users   |
| POST Create   | POST   | https://jsonplaceholder.typicode.com/posts   |
| DELETE Post   | DELETE | https://jsonplaceholder.typicode.com/posts/1 |

---

## Developer

Built for Hackathon — API Testing Platform challenge.
