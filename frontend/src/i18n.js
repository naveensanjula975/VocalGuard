import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// For simplicity, defining translations inline. Normally you'd load these from separate JSON files.
const resources = {
    en: {
        translation: {
            "Upload Audio": "Upload Audio",
            "Upload MP3, WAV or FLAC file to analyze": "Upload MP3, WAV or FLAC file to analyze",
            "Starting upload...": "Starting upload...",
            "Complete!": "Complete!",
            "Analysis complete!": "Analysis complete!",
            "Authentication error. Please login again.": "Authentication error. Please login again.",
            "File too large. Please choose a smaller audio file.": "File too large. Please choose a smaller audio file.",
            "Network error. Please check your connection and try again.": "Network error. Please check your connection and try again.",
            "Failed to analyze audio": "Failed to analyze audio",
            "Please select a file to process": "Please select a file to process",
            "You must be logged in to analyze audio": "You must be logged in to analyze audio",
            "Home": "Home",
            "About us": "About us",
            "Login": "Login",
            "History": "History",
            "Profile Settings": "Profile Settings",
            "Logout": "Logout",
            "Upload Voice": "Upload Voice",
            "Get Started": "Get Started",
            "Your trusted solution": "Your trusted solution",
            "for detecting AI": "for detecting AI",
            "generated voices.": "generated voices."
        }
    },
    es: {
        translation: {
            "Upload Audio": "Subir Audio",
            "Upload MP3, WAV or FLAC file to analyze": "Sube un archivo MP3, WAV o FLAC para analizar",
            "Starting upload...": "Iniciando carga...",
            "Complete!": "¡Completado!",
            "Analysis complete!": "¡Análisis completo!",
            "Authentication error. Please login again.": "Error de autenticación. Por favor, inicie sesión de nuevo.",
            "File too large. Please choose a smaller audio file.": "Archivo demasiado grande. Elija un archivo de audio más pequeño.",
            "Network error. Please check your connection and try again.": "Error de red. Verifique su conexión e intente nuevamente.",
            "Failed to analyze audio": "Error al analizar el audio",
            "Please select a file to process": "Seleccione un archivo para procesar",
            "You must be logged in to analyze audio": "Debe iniciar sesión para analizar el audio",
            "Home": "Inicio",
            "About us": "Nosotros",
            "Login": "Iniciar Sesión",
            "History": "Historial",
            "Profile Settings": "Configuración de perfil",
            "Logout": "Cerrar sesión",
            "Upload Voice": "Subir Voz",
            "Get Started": "Empezar",
            "Your trusted solution": "Tu solución confiable",
            "for detecting AI": "para detectar IA",
            "generated voices.": "voces generadas."
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en', // default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;
