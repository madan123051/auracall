import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export const LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
];

const messages = {
  en: {
    calls: "Calls",
    chats: "Chats",
    friends: "Friends",
    profile: "Profile",
    dashboard: "Dashboard",
    online: "Online",
    search: "Search",
    shareProfile: "Share profile",
    profileStudio: "Profile Studio",
    editProfile: "Edit profile",
    displayLanguage: "Display language",
    autoTranslate: "Auto-translate messages",
    autoTranslateHelp: "Incoming messages are translated into your display language.",
    aiAssistant: "AI assistant",
    smartReply: "Smart reply",
    summarize: "Summarize",
    translate: "Translate",
    original: "Original",
    translated: "Translated",
    typeMessage: "Type a message...",
    saveChanges: "Save changes",
    changePhoto: "Change photo",
    copyLink: "Copy link",
    openProfile: "Open public profile",
    signOut: "Sign out",
    menu: "Menu",
    close: "Close",
    aiReady: "AI ready",
    aiFallback: "AI fallback mode",
    protectedCalls: "Protected calls",
    noConversations: "No conversations yet",
    noCalls: "No call history",
    startConversation: "Start a conversation",
  },
  hi: {
    calls: "कॉल",
    chats: "चैट",
    friends: "दोस्त",
    profile: "प्रोफाइल",
    dashboard: "डैशबोर्ड",
    online: "ऑनलाइन",
    search: "खोजें",
    shareProfile: "प्रोफाइल साझा करें",
    profileStudio: "प्रोफाइल स्टूडियो",
    editProfile: "प्रोफाइल बदलें",
    displayLanguage: "दिखाने की भाषा",
    autoTranslate: "संदेश अपने आप अनुवाद करें",
    autoTranslateHelp: "आने वाले संदेश आपकी चुनी हुई भाषा में दिखेंगे।",
    aiAssistant: "AI सहायक",
    smartReply: "स्मार्ट जवाब",
    summarize: "सारांश",
    translate: "अनुवाद",
    original: "मूल",
    translated: "अनुवादित",
    typeMessage: "संदेश लिखें...",
    saveChanges: "बदलाव सेव करें",
    changePhoto: "फोटो बदलें",
    copyLink: "लिंक कॉपी करें",
    openProfile: "पब्लिक प्रोफाइल खोलें",
    signOut: "साइन आउट",
    menu: "मेन्यू",
    close: "बंद करें",
    aiReady: "AI तैयार",
    aiFallback: "AI फॉलबैक मोड",
    protectedCalls: "सुरक्षित कॉल",
    noConversations: "अभी कोई बातचीत नहीं",
    noCalls: "अभी कोई कॉल इतिहास नहीं",
    startConversation: "बातचीत शुरू करें",
  },
  ja: {
    calls: "通話",
    chats: "チャット",
    friends: "友だち",
    profile: "プロフィール",
    dashboard: "ダッシュボード",
    online: "オンライン",
    search: "検索",
    shareProfile: "プロフィールを共有",
    profileStudio: "プロフィールスタジオ",
    editProfile: "プロフィール編集",
    displayLanguage: "表示言語",
    autoTranslate: "メッセージを自動翻訳",
    autoTranslateHelp: "受信メッセージを表示言語に翻訳します。",
    aiAssistant: "AIアシスタント",
    smartReply: "スマート返信",
    summarize: "要約",
    translate: "翻訳",
    original: "原文",
    translated: "翻訳",
    typeMessage: "メッセージを入力...",
    saveChanges: "変更を保存",
    changePhoto: "写真を変更",
    copyLink: "リンクをコピー",
    openProfile: "公開プロフィールを開く",
    signOut: "ログアウト",
    menu: "メニュー",
    close: "閉じる",
    aiReady: "AI準備完了",
    aiFallback: "AIフォールバック",
    protectedCalls: "保護された通話",
    noConversations: "会話はまだありません",
    noCalls: "通話履歴はありません",
    startConversation: "会話を始める",
  },
  es: {
    calls: "Llamadas",
    chats: "Chats",
    friends: "Amigos",
    profile: "Perfil",
    dashboard: "Panel",
    online: "En línea",
    search: "Buscar",
    shareProfile: "Compartir perfil",
    profileStudio: "Estudio de perfil",
    editProfile: "Editar perfil",
    displayLanguage: "Idioma de pantalla",
    autoTranslate: "Traducir mensajes automáticamente",
    autoTranslateHelp: "Los mensajes entrantes se traducen a tu idioma.",
    aiAssistant: "Asistente de IA",
    smartReply: "Respuesta inteligente",
    summarize: "Resumir",
    translate: "Traducir",
    original: "Original",
    translated: "Traducido",
    typeMessage: "Escribe un mensaje...",
    saveChanges: "Guardar cambios",
    changePhoto: "Cambiar foto",
    copyLink: "Copiar enlace",
    openProfile: "Abrir perfil público",
    signOut: "Cerrar sesión",
    menu: "Menú",
    close: "Cerrar",
    aiReady: "IA lista",
    aiFallback: "Modo alternativo de IA",
    protectedCalls: "Llamadas protegidas",
    noConversations: "Aún no hay conversaciones",
    noCalls: "No hay historial de llamadas",
    startConversation: "Iniciar una conversación",
  },
  ar: {
    calls: "المكالمات",
    chats: "الدردشات",
    friends: "الأصدقاء",
    profile: "الملف الشخصي",
    dashboard: "لوحة التحكم",
    online: "متصل",
    search: "بحث",
    shareProfile: "مشاركة الملف",
    profileStudio: "استوديو الملف الشخصي",
    editProfile: "تعديل الملف",
    displayLanguage: "لغة العرض",
    autoTranslate: "ترجمة الرسائل تلقائيا",
    autoTranslateHelp: "تترجم الرسائل الواردة إلى لغة العرض.",
    aiAssistant: "مساعد الذكاء الاصطناعي",
    smartReply: "رد ذكي",
    summarize: "تلخيص",
    translate: "ترجمة",
    original: "الأصل",
    translated: "مترجم",
    typeMessage: "اكتب رسالة...",
    saveChanges: "حفظ التغييرات",
    changePhoto: "تغيير الصورة",
    copyLink: "نسخ الرابط",
    openProfile: "فتح الملف العام",
    signOut: "تسجيل الخروج",
    menu: "القائمة",
    close: "إغلاق",
    aiReady: "الذكاء الاصطناعي جاهز",
    aiFallback: "وضع الذكاء الاصطناعي البديل",
    protectedCalls: "مكالمات محمية",
    noConversations: "لا توجد محادثات بعد",
    noCalls: "لا يوجد سجل مكالمات",
    startConversation: "ابدأ محادثة",
  },
};

const LanguageContext = createContext(null);

function detectLanguage() {
  if (typeof navigator === "undefined") return "en";
  const browserLanguage = navigator.language?.split("-")[0] || "en";
  return LANGUAGES.some((item) => item.code === browserLanguage) ? browserLanguage : "en";
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState("en");
  const [autoTranslate, setAutoTranslateState] = useState(true);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("auracall-language");
    const savedAutoTranslate = window.localStorage.getItem("auracall-auto-translate");
    setLanguageState(savedLanguage || detectLanguage());
    setAutoTranslateState(savedAutoTranslate !== "false");
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      autoTranslate,
      languages: LANGUAGES,
      setLanguage(nextLanguage) {
        setLanguageState(nextLanguage);
        window.localStorage.setItem("auracall-language", nextLanguage);
      },
      setAutoTranslate(enabled) {
        setAutoTranslateState(enabled);
        window.localStorage.setItem("auracall-auto-translate", String(enabled));
      },
      t(key) {
        return messages[language]?.[key] || messages.en[key] || key;
      },
    }),
    [autoTranslate, language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
