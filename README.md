
# Node.js & MongoDB Web Project

This is a full-stack web application built with Node.js, Express, and MongoDB. It serves as a simple news and article sharing platform where users can register, post content, and interact with each other through comments.

## Features

- **User Authentication:** Secure user registration and login.
- **Remember Me:** Persistent login sessions using cookies.
- **News Feed:** A main page displaying the latest news articles.
- **Article Posting:** Registered users can create and post new articles.
- **Interactive Comments:** Users can comment on articles and reply to other comments.
- **User Profiles:** A simple profile page for users.

## Technologies Used

- **Backend:** Node.js, Express.js, Mongoose
- **Frontend:** Pug (formerly Jade) for server-side rendering
- **Database:** MongoDB
- **Containerization:** Docker & Docker Compose

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

Follow these steps to get the project up and running on your local machine.

**1. Clone the Repository**

```bash
git clone <your-repository-url>
cd <project-directory>
```

**2. Create an Environment File**

Create a file named `.env` in the root of the project directory and add the following configuration. This file stores the necessary environment variables.

```env
MONGO_CONNECT=mongodb://mongodb:27017/website
PORT=3000
```

- `MONGO_CONNECT`: The connection string for the MongoDB container.
- `PORT`: The port on which the web server will be accessible.

**3. Build and Run the Application**

Use Docker Compose to build the images and start the containers in detached mode.

```bash
docker-compose up -d --build
```

This command will start both the `node-server` and the `mongodb` services.

**4. Access the Application**

Once the containers are running, you can access the application by navigating to the following URL in your web browser:

[http://localhost:3000](http://localhost:3000)

## Project Structure

```
/website-project
|-- Models/             # Mongoose data models (User, News)
|-- node_modules/       # Project dependencies
|-- public/             # Static assets (CSS, images)
|-- views/              # Pug template files
|-- .env                # Environment variables
|-- docker-compose.yml  # Docker Compose configuration
|-- Dockerfile          # Docker configuration for the Node.js app
|-- index.js            # Main application entry point
|-- package.json        # Project metadata and dependencies
|-- README.md           # This file
```
