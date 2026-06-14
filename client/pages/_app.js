import Head from 'next/head';
import { AuthProvider } from '../components/AuthProvider';
import { LanguageProvider } from '../lib/i18n';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>AuraCall X | AI Chat, Translation and Calls</title>
        <meta
          name="description"
          content="AuraCall X brings AI-assisted chat, automatic translation, profile sharing, and protected voice and video calls together."
        />
        <meta name="theme-color" content="#060816" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <AuthProvider>
        <LanguageProvider>
          <Component {...pageProps} />
        </LanguageProvider>
      </AuthProvider>
    </>
  );
}
