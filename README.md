# Himeo CV Automation

Outil d'automatisation de la mise sous trame des CV pour Himeo.

## Features

- **Upload CV**: Drag & Drop pour PDF/DOCX
- **Extraction IA**: Extraction et normalisation des données via Claude 3.5 Sonnet
- **Review**: Interface de validation et correction des données extraites
- **Export**: Génération de CV au format DOCX respectant la charte Himeo

## Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI (Lucide React)
- **AI**: Vercel AI SDK + Anthropic
- **Database**: Supabase
- **Storage**: Supabase Storage
- **Doc Gen**: docx

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser.
