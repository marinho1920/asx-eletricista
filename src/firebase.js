import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// 1) Vá em https://console.firebase.google.com
// 2) Crie um projeto (gratuito)
// 3) Ative o "Firestore Database" (modo teste, por enquanto)
// 4) Em "Configurações do projeto" > "Seus apps" > ícone "</>" (Web), registre um app
// 5) Copie o objeto de configuração que aparece e cole aqui embaixo
const firebaseConfig = {
  apiKey: npm install firebase,
  authDomain: npm install firebase.firebaseapp.com,
  projectId: npm install firebase,
  storageBucket: npm install firebase.appspot.com,
  messagingSenderId: asx-eletricista,
  appId: 198949142258,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Coleção onde tudo do app fica guardado.
// Cada "chave" (contas, servicos, recuperacoes, contas_removidas) vira um documento
// com um campo "value" contendo o JSON — igual ao window.storage do Claude.
const COLLECTION = "painel-eletricista";

export async function storageGet(key) {
  try {
    const ref = doc(db, COLLECTION, key);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data().value : null;
  } catch (e) {
    console.error("Erro ao ler do Firestore:", e);
    return null;
  }
}

export async function storageSet(key, value) {
  try {
    const ref = doc(db, COLLECTION, key);
    await setDoc(ref, { value, atualizadoEm: Date.now() });
    return true;
  } catch (e) {
    console.error("Erro ao salvar no Firestore:", e);
    return false;
  }
}
}
}# 1) resgata o capacitor.config.json que está preso na pasta errada, e limpa o lixo
mv painel-eletricista/capacitor.config.json . 2>/dev/null
rm -rf App.jsx painel-eletricista estrutura.txt

# 2) cria os arquivos que faltam
cat > package.json << 'EOF'
{
  "name": "painel-eletricista",
    "private": true,
      "version": "1.0.0",
        "type": "module",
          "scripts": {
              "dev": "vite",
                  "build": "vite build",
                      "preview": "vite preview"
                        },
                          "dependencies": {
                              "react": "^18.3.1",
                                  "react-dom": "^18.3.1",
                                      "lucide-react": "^0.383.0",
                                          "firebase": "^10.12.0",
                                              "@capacitor/core": "^6.1.0",
                                                  "@capacitor/android": "^6.1.0"
                                                    },
                                                      "devDependencies": {
                                                          "@capacitor/cli": "^6.1.0",
                                                              "@vitejs/plugin-react": "^4.3.1",
                                                                  "vite": "^5.3.1"
                                                                    }
                                                                    }
                                                                    EOF

                                                                    cat > vite.config.js << 'EOF'
                                                                    import { defineConfig } from "vite";
                                                                    import react from "@vitejs/plugin-react";

                                                                    export default defineConfig({
                                                                      plugins: [react()],
                                                                      });
                                                                      EOF

                                                                      cat > index.html << 'EOF'
                                                                      <!doctype html>
                                                                      <html lang="pt-BR">
                                                                        <head>
                                                                            <meta charset="UTF-8" />
                                                                                <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
                                                                                    <title>Painel de Serviços</title>
                                                                                      </head>
                                                                                        <body style="margin:0">
                                                                                            <div id="root"></div>
                                                                                                <script type="module" src="/src/main.jsx"></script>
                                                                                                  </body>
                                                                                                  </html>
                                                                                                  EOF

                                                                                                  cat > .gitignore << 'EOF'
                                                                                                  node_modules/
                                                                                                  dist/
                                                                                                  android/
                                                                                                  .DS_Store
                                                                                                  EOF

                                                                                                  mkdir -p .github/workflows
                                                                                                  cat > .github/workflows/build-apk.yml << 'EOF'
                                                                                                  name: Build APK

                                                                                                  on:
                                                                                                    push:
                                                                                                        branches: [main]
                                                                                                          workflow_dispatch: {}

                                                                                                          jobs:
                                                                                                            build:
                                                                                                                runs-on: ubuntu-latest
                                                                                                                    steps:
                                                                                                                          - name: Checkout código
                                                                                                                                  uses: actions/checkout@v4

                                                                                                                                        - name: Configurar Node
                                                                                                                                                uses: actions/setup-node@v4
                                                                                                                                                        with:
                                                                                                                                                                  node-version: 20

                                                                                                                                                                        - name: Instalar dependências
                                                                                                                                                                                run: npm install

                                                                                                                                                                                      - name: Build do app web
                                                                                                                                                                                              run: npm run build

                                                                                                                                                                                                    - name: Adicionar plataforma Android
                                                                                                                                                                                                            run: npx cap add android

                                                                                                                                                                                                                  - name: Sincronizar Capacitor
                                                                                                                                                                                                                          run: npx cap sync android

                                                                                                                                                                                                                                - name: Configurar Java
                                                                                                                                                                                                                                        uses: actions/setup-java@v4
                                                                                                                                                                                                                                                with:
                                                                                                                                                                                                                                                          distribution: temurin
                                                                                                                                                                                                                                                                    java-version: "17"

                                                                                                                                                                                                                                                                          - name: Dar permissão de execução ao gradlew
                                                                                                                                                                                                                                                                                  run: chmod +x android/gradlew

                                                                                                                                                                                                                                                                                        - name: Build do APK (debug)
                                                                                                                                                                                                                                                                                                working-directory: android
                                                                                                                                                                                                                                                                                                        run: ./gradlew assembleDebug

                                                                                                                                                                                                                                                                                                              - name: Enviar APK como artefato
                                                                                                                                                                                                                                                                                                                      uses: actions/u
}
}
}
}
# 1) resgata o capacitor.config.json que está preso na pasta errada, e limpa o lixo
mv painel-eletricista/capacitor.config.json . 2>/dev/null
rm -rf App.jsx painel-eletricista estrutura.txt

# 2) cria os arquivos que faltam
cat > package.json << 'EOF'
{
  "name": "painel-eletricista",
    "private": true,
      "version": "1.0.0",
        "type": "module",
          "scripts": {
              "dev": "vite",
                  "build": "vite build",
                      "preview": "vite preview"
                        },
                          "dependencies": {
                              "react": "^18.3.1",
                                  "react-dom": "^18.3.1",
                                      "lucide-react": "^0.383.0",
                                          "firebase": "^10.12.0",
                                              "@capacitor/core": "^6.1.0",
                                                  "@capacitor/android": "^6.1.0"
                                                    },
                                                      "devDependencies": {
                                                          "@capacitor/cli": "^6.1.0",
                                                              "@vitejs/plugin-react": "^4.3.1",
                                                                  "vite": "^5.3.1"
                                                                    }
                                                                    }
                                                                    EOF

                                                                    cat > vite.config.js << 'EOF'
                                                                    import { defineConfig } from "vite";
                                                                    import react from "@vitejs/plugin-react";
import { lazy } from "react";

                                                                    export default defineConfig({
                                                                      plugins: [react()],
                                                                      });
                                                                      EOF

                                                                      cat > index.html << 'EOF'
                                                                      <!doctype html>
                                                                      <html lang="pt-BR">
                                                                        <head>
                                                                            <meta charset="UTF-8" />
                                                                                <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
                                                                                    <title>Painel de Serviços</title>
                                                                                      </head>
                                                                                        <body style="margin:0">
                                                                                            <div id="root"></div>
                                                                                                <script type="module" src="/src/main.jsx"></script>
                                                                                                  </body>
                                                                                                  </html>
                                                                                                  EOF

                                                                                                  cat > .gitignore << 'EOF'
                                                                                                  node_modules/
                                                                                                  dist/
                                                                                                  android/
                                                                                                  .DS_Store
                                                                                                  EOF

                                                                                                  mkdir -p .github/workflows
                                                                                                  cat > .github/workflows/build-apk.yml << 'EOF'
                                                                                                  name: Build APK

                                                                                                  on:
                                                                                                    push:
                                                                                                        branches: [main]
                                                                                                          workflow_dispatch: {}

                                                                                                          jobs:
                                                                                                            build:
                                                                                                                runs-on: ubuntu-latest
                                                                                                                    steps:
                                                                                                                          - name: Checkout código
                                                                                                                                  uses: actions/checkout@v4

                                                                                                                                        - name: Configurar Node
                                                                                                                                                uses: actions/setup-node@v4
                                                                                                                                                        with:
                                                                                                                                                                  node-version: 20

                                                                                                                                                                        - name: Instalar dependências
                                                                                                                                                                                run: npm install

                                                                                                                                                                                      - name: Build do app web
                                                                                                                                                                                              run: npm run build

                                                                                                                                                                                                    - name: Adicionar plataforma Android
                                                                                                                                                                                                            run: npx cap add android

                                                                                                                                                                                                                  - name: Sincronizar Capacitor
                                                                                                                                                                                                                          run: npx cap sync android

                                                                                                                                                                                                                                - name: Configurar Java
                                                                                                                                                                                                                                        uses: actions/setup-java@v4
                                                                                                                                                                                                                                                with:
                                                                                                                                                                                                                                                          distribution: temurin
                                                                                                                                                                                                                                                                    java-version: "17"

                                                                                                                                                                                                                                                                          - name: Dar permissão de execução ao gradlew
                                                                                                                                                                                                                                                                                  run: chmod +x android/gradlew

                                                                                                                                                                                                                                                                                        - name: Build do APK (debug)
                                                                                                                                                                                                                                                                                                working-directory: android
                                                                                                                                                                                                                                                                                                        run: ./gradlew assembleDebug

                                                                                                                                                                                                                                                                                                              - name: Enviar APK como artefato
                                                                                                                                                                                                                                                                                                                      uses: actions/upload-artifact@v4
                                                                                                                                                                                                                                                                                                                              with:
                                                                                                                                                                                                                                                                                                                                        name: app-debug-apk
                                                                                                                                                                                                                                                                                                                                                  path: android/app/build/outputs/apk/debug/app-debug.apk
                                                                                                                                                                                                                                                                                                                                                  EOF

                                                                                                                                                                                                                                                                                                                                                  # 3) confirma que ficou tudo certo na raiz
                                                                                                                                                                                                                                                                                                                                                  ls -lazy
                                                                                                                                                                                                                                                                                                                                                  