# DaVinci Frontend

Modern React + Vite + Tailwind CSS invoice viewer application.

## 🚀 Tech Stack

- **React 18** (latest)
- **TypeScript**
- **Vite 7** (latest)
- **Tailwind CSS 4** (latest)
- **PostCSS** with Autoprefixer

## 📦 Installation

```bash
npm install
```

## 🏃 Development

```bash
npm run dev
```

Server runs on: **http://localhost:3001**

## 🔌 API Integration

The frontend is configured to proxy API requests to the backend server:

- **Backend**: `http://localhost:3000`
- **Frontend**: `http://localhost:3001`
- **API Proxy**: `/api/*` → `http://localhost:3000/api/*`

## 📄 Features

### Invoice Viewer Page

- **Fetch invoice data** by ID from the backend API
- **Display complete invoice details**:
  - Client information
  - Flight details (origin, destination, aircraft)
  - FIR (Flight Information Region) data
  - Fee breakdown with currency conversion
  - Status badges with color coding
- **Responsive design** with Tailwind CSS
- **Error handling** with user-friendly messages
- **Loading states** with spinner animation

## 🎨 UI Components

- Modern gradient header
- Card-based layout
- Responsive grid system
- Status badges (PAID, PENDING, OVERDUE, etc.)
- Currency formatting
- Date formatting
- Clean typography

##🛠️ Build

```bash
npm run build
```

## 📁 Project Structure

```
davinci_Frontend/
├── src/
│   ├── App.tsx          # Main invoice viewer component
│   ├── index.css        # Tailwind directives
│   └── main.tsx         # Entry point
├── public/              # Static assets
├── index.html           # HTML template
├── vite.config.ts       # Vite config (port 3001 + proxy)
├── tailwind.config.js   # Tailwind CSS config
├── postcss.config.js    # PostCSS config
└── tsconfig.json        # TypeScript config
```

## 🔧 Configuration

### Vite Config

```typescript
server: {
  port: 3001,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

### Tailwind Config

```javascript
content: [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",
]
```

## 📝 Usage

1. Start the backend server on port 3000
2. Start the frontend: `npm run dev`
3. Open browser to `http://localhost:3001`
4. Enter an invoice ID (default: 23)
5. Click "Fetch Invoice" to view details

## 🎯 API Endpoint Used

```
GET /api/invoices/:invoiceId
```

Returns flat JSON structure matching the database schema.

## 🌟 Features Highlight

- ✅ **Latest versions** of all dependencies
- ✅ **TypeScript** for type safety
- ✅ **Tailwind CSS** for modern styling
- ✅ **Vite** for blazing fast HMR
- ✅ **Production-ready** error handling
- ✅ **Responsive** design
- ✅ **Clean** code structure

## 📚 Learn More

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vite.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
