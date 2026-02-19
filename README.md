
# 🚀 NexusHR - Modern HR Management System

NexusHR is a comprehensive, cloud-ready Human Resource Management System (HRMS) designed for modern organizations. It streamlines workforce management, attendance tracking, and leave administration through a high-performance, aesthetically pleasing interface.

## ✨ Key Features

- **Personalized Dashboard**: Real-time attendance tracking with clock-in/out functionality and location tagging.
- **Dynamic Workforce Management**: Admin tools for employee registration, profile management, and role assignment.
- **Advanced Leave System**: Requester and Approver workflows with automated balance calculation.
- **Detailed Attendance Logs**: Table and Calendar views for tracking punctuality and total work hours.
- **Communication Hub**: System-wide broadcasts for instant employee notifications.
- **GitHub Backup Sync**: Built-in integration to back up HR data to a GitHub repository with Gemini AI-powered commit messages.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Routing**: React Router 7
- **Icons**: Font Awesome 6
- **AI Integration**: Google Gemini API (@google/genai)
- **Backend Ready**: Pre-configured services for REST API interaction.

## 🚀 Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Environment Setup**:
    Ensure `process.env.API_KEY` is configured for Gemini AI features.
3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## 📂 Project Structure

- `/components`: Reusable UI elements (Navbar, Sidebar, Layouts).
- `/pages`: Main view components (Dashboard, Admin, Profile).
- `/services`: API client and data interaction logic.
- `/hooks`: Custom React hooks for global state management.
- `/types`: TypeScript definitions for the system schema.

## 📄 License

This project is licensed under the MIT License.
