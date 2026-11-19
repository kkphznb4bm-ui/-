/* Настройки Firebase проекта «blue-mira». Эти значения не секретные: доступ к данным защищают правила базы (firestore.rules).
   Если удалить блок (оставить window.FIREBASE_CONFIG = null), сайт перейдёт в демо-режим. */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAW0494jq7UBxEAmhDlqlypQ_iRYUiuuLY",
  authDomain: "blue-mira.firebaseapp.com",
  projectId: "blue-mira",
  storageBucket: "blue-mira.firebasestorage.app",
  messagingSenderId: "878686070750",
  appId: "1:878686070750:web:4f770e4993bd55787f1f4f",
  adminEmail: "adminvkusmira@gmail.com"
};

/* Подсказки демо-режима (логин и пароль демо на странице входа). На публичном сайте Netlify выключаются автоматически. */
window.SHOW_DEMO = true;
