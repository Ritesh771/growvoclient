# Growvo - Freelancer Project Access Portal

A secure, modern web application for managing freelancer access to client projects. Built with React, TypeScript, and Supabase.

## Features

- **Client Portal**: Generate secure, time-limited project access codes
- **Freelancer Access**: Enter project codes to access GitHub repositories and analytics
- **GitHub Integration**: View repository analytics, commit timelines, and project insights
- **OTP Verification**: Secure authentication with one-time passwords
- **Mobile Optimized**: Responsive design that works on all devices
- **Enterprise Security**: Auto-expiring codes and secure access management

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: Tailwind CSS, Shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Charts**: Recharts for data visualization
- **State Management**: React Query for server state
- **Routing**: React Router DOM

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Ritesh771/growvoclient.git
cd growvoclient
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:8080`.

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Shadcn/ui components
│   ├── AdminView.tsx   # Client admin interface
│   ├── DeveloperView.tsx # Freelancer interface
│   └── ...
├── contexts/           # React contexts (Auth)
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
├── lib/                # Utility functions
├── pages/              # Route components
└── ...

supabase/
├── config.toml         # Supabase configuration
├── functions/          # Edge functions
└── migrations/         # Database migrations
```

## Database Schema

The application uses Supabase with the following main tables:
- `project_codes` - Generated access codes
- `github_repositories` - Linked GitHub repos
- `otp_verification` - OTP codes for authentication

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is private and proprietary.

## Support

For support or questions, please contact the development team.