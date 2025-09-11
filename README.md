# Node.js & MongoDB Web Project

This is a full-stack web application built with Node.js, Express, and MongoDB. It serves as a simple news and article sharing platform where users can register, post content, and interact with each other through comments.

## Features

- **User Authentication:** Secure user registration and login with password hashing (bcrypt).
- **Remember Me:** Persistent login sessions using cookies and secure tokens.
- **News Feed:** A main page displaying the latest news articles.
- **Article Posting:** Registered users can create and post new articles with images.
- **Interactive Comments:** Users can comment on articles and reply to other comments.
- **User Profiles:** A simple profile page for users to view their information.
- **RESTful API:** A structured API for handling user and news-related actions.

## Technologies Used

- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose ODM
- **Frontend:** Pug (Server-Side Rendering)
- **Authentication & Session:** `express-session`, `bcrypt`, `cookie-parser`
- **API & Data Handling:** `body-parser`, `uuid`
- **Containerization:** Docker & Docker Compose

## Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

**1. Clone the Repository**

```bash
git clone https://github.com/MuhammedArdaZ/Website-Project.git
```

**2. Create an Environment File**

Create a `.env` file in the root directory and add the following variables:

```env
MONGO_CONNECT=mongodb://mongodb:27017/website
PORT=3000
```

**3. Build and Run with Docker Compose**

```bash
docker-compose up -d --build
```

The application will be accessible at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
/website-project
|-- .dockerignore
|-- .env_example
|-- .gitignore
|-- docker-compose.yml
|-- Dockerfile
|-- index.js              # Main application entry point
|-- package.json
|-- README.md
|
|-- models/               # Mongoose data models
|   |-- commentModel.js
|   |-- commentReplyModel.js
|   |-- newsModel.js
|   `-- userModel.js
|
|-- public/               # Static assets (CSS, images)
|
|-- services/             # Business logic and route handlers
|   |-- pageService.js
|   `-- userService.js
|
|-- sessions/             # Session files
|
`-- views/                # Pug template files
    |-- login-page.pug
    |-- main-page.pug
    |-- news-page.pug
    |-- profile-page.pug
    |-- register-page.pug
    `-- upload-news-page.pug
```

## API Endpoints

### User Authentication
- `POST /api/register`: Register a new user.
- `POST /api/login`: Log in a user.
- `POST /api/logout`: Log out a user.

### News & Content
- `POST /api/upload-news`: Upload a new news article.
- `POST /api/news/:newsId/addComment`: Add a comment to a news article.
- `POST /api/news/:newsId/addCommentReply`: Reply to a comment.