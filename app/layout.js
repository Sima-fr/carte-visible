import './globals.css';

export const metadata = {
  title: 'Carte Visible',
  description: "La carte de votre restaurant, en photos.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
