# CodeClan — Backend API 🛡️

The secure, high-performance engine powering the CodeClan developer ecosystem. Built with Node.js, Express, and MongoDB.

## 🚀 Key Features

- **Stateful Authentication**: Secure JWT-based sessions with database-backed refresh tokens and explicit logout revocation.
- **Role-Based Access Control**: Granular permissions for Users and Admins.
- **Social Discovery Engine**: Real-time follow/follower system and snippet engagement metrics.
- **Media Optimization**: Integrated Cloudinary pipeline for automatic avatar and snippet asset management.
- **Secure Emailing**: Automated SMTP system for account verification and recovery.
- **Rate Limiting**: Built-in protection against brute-force and vote manipulation via `express-rate-limit`.

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Security**: Bcrypt, JWT, Cookie-parser
- **Storage**: Cloudinary
- **Communication**: Nodemailer

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd CodeClan-Backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (refer to `.env.production` for required keys).

4. **Start the server**:
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 🌐 API Overview

- `POST /api/users/login` - Secure uplink establishment.
- `GET /api/snippets/discover` - Fetch public knowledge nodes.
- `POST /api/snippets/:id/vote` - Upvote/Downvote code snippets (Rate-limited).
- `GET /api/admin/stats` - Platform health and user metrics.

---
Built by [Shubhradeep, Arnab, Mrigannko]
