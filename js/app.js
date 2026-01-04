// アプリケーションの状態管理
let appData = null;
let currentSection = 'top';

// index.html のフォールバック判定用（app.js が実行されたか）
window.__handoverAppStarted = true;

// 初期化
async function init() {
    try {
        // JSONデータを読み込む
        appData = await loadAppData();
        if (!appData) return; // file:// の場合は、ユーザーのファイル選択待ちでここに来る
        
        // ナビゲーションを構築
        buildNavigation();
        
        // トップページを表示
        showTopPage();
        
        // ハッシュ変更イベントを監視（ブラウザの戻る/進むボタン対応）
        window.addEventListener('hashchange', handleHashChange);
        
        // 初期ハッシュを処理
        handleHashChange();
    } catch (error) {
        console.error('初期化エラー:', error);
        const jsonUrl = new URL('./data/content.json', window.location.href);
        if (window.location.protocol === 'file:') {
            showLocalFileLoader(error);
            return;
        }
        showError([
            'データの読み込みに失敗しました。<br>',
            `確認: <code>${escapeHtml(jsonUrl.toString())}</code> が開けるか、Console/Network を確認してください。`
        ].join(''));
    }
}

async function loadAppData() {
    // SharePoint(https) では fetch でOK。
    // ただし file:// で直接開くと、ブラウザの仕様で fetch がCORSによりブロックされるため、
    // ローカルプレビュー用に「ファイル選択で読み込み」フォールバックを提供する。
    if (window.location.protocol === 'file:') {
        showLocalFileLoader();
        return null;
    }

    const jsonUrl = new URL('./data/content.json', window.location.href);
    const response = await fetch(jsonUrl.toString(), { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`データの読み込みに失敗しました（HTTP ${response.status}）`);
    }

    // 認証リダイレクト等でHTMLが返るケースを検知しやすくする
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    if (contentType.includes('text/html') || text.trim().startsWith('<!DOCTYPE html')) {
        throw new Error('content.json の代わりに HTML が返されました（認証/リダイレクトの可能性）');
    }
    return JSON.parse(text);
}

// ナビゲーションを構築
function buildNavigation() {
    const nav = document.getElementById('navigation');
    if (!nav) return;
    
    const navHTML = `
        <h1>${appData.siteTitle}</h1>
        <ul>
            <li><a href="#top" data-section="top">トップ</a></li>
            <li><a href="#overview" data-section="overview">${appData.sections.overview.title}</a></li>
            <li><a href="#preparation" data-section="preparation">${appData.sections.preparation.title}</a></li>
            <li><a href="#dayOfEvent" data-section="dayOfEvent">${appData.sections.dayOfEvent.title}</a></li>
            <li><a href="#afterEvent" data-section="afterEvent">${appData.sections.afterEvent.title}</a></li>
            <li><a href="#troubleshooting" data-section="troubleshooting">${appData.sections.troubleshooting.title}</a></li>
            <li><a href="#faq" data-section="faq">${appData.sections.faq.title}</a></li>
            <li><a href="#resources" data-section="resources">${appData.sections.resources.title}</a></li>
        </ul>
    `;
    
    nav.innerHTML = navHTML;
    
    // ナビゲーションリンクにイベントリスナーを追加
    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            navigateToSection(section);
        });
    });
}

// ハッシュ変更を処理
function handleHashChange() {
    const hash = window.location.hash.substring(1) || 'top';
    navigateToSection(hash);
}

// セクションに遷移
function navigateToSection(section) {
    currentSection = section;
    
    // ナビゲーションのアクティブ状態を更新
    document.querySelectorAll('#navigation a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === section) {
            link.classList.add('active');
        }
    });
    
    // ハッシュを更新（ページリロードなし）
    if (window.location.hash !== `#${section}`) {
        window.history.pushState(null, '', `#${section}`);
    }
    
    // コンテンツを表示
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    switch (section) {
        case 'top':
            showTopPage();
            break;
        case 'overview':
            showOverview();
            break;
        case 'preparation':
            showPreparation();
            break;
        case 'dayOfEvent':
            showDayOfEvent();
            break;
        case 'afterEvent':
            showAfterEvent();
            break;
        case 'troubleshooting':
            showTroubleshooting();
            break;
        case 'faq':
            showFAQ();
            break;
        case 'resources':
            showResources();
            break;
        default:
            showTopPage();
    }
}

// トップページを表示
function showTopPage() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    // マインドマップを表示
    const mindmapHTML = showMindmap();
    
    const sections = appData.sections;
    const cardsHTML = Object.keys(sections).map(key => {
        const section = sections[key];
        return `
            <a href="#${key}" class="section-card" data-section="${key}">
                <h2>${section.title}</h2>
                <p>${section.description}</p>
            </a>
        `;
    }).join('');
    
    mainContent.innerHTML = `
        <div class="top-page">
            <h1>${appData.siteTitle}</h1>
            <p class="description">${appData.siteDescription}</p>
            <div class="mindmap-container">
                ${mindmapHTML}
            </div>
            <h2 style="margin-top: 40px; margin-bottom: 20px;">詳細セクション</h2>
            <div class="section-cards">
                ${cardsHTML}
            </div>
        </div>
    `;
    
    // カードクリックイベント
    mainContent.querySelectorAll('.section-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const section = card.getAttribute('data-section');
            navigateToSection(section);
        });
    });
}

// マインドマップを表示
function showMindmap() {
    if (!appData.mindmap) return '';
    
    const mindmap = appData.mindmap;
    const branchesHTML = mindmap.branches.map(branch => {
        const itemsHTML = branch.items.map(item => `<li>${item}</li>`).join('');
        return `
            <div class="mindmap-branch" style="border-color: ${branch.color};">
                <div class="mindmap-branch-header" style="background-color: ${branch.color};">
                    ${branch.label}
                </div>
                <ul class="mindmap-branch-items">
                    ${itemsHTML}
                </ul>
            </div>
        `;
    }).join('');
    
    return `
        <div class="mindmap">
            <div class="mindmap-center">${mindmap.center}</div>
            <div class="mindmap-branches">
                ${branchesHTML}
            </div>
        </div>
    `;
}

// 業務概要を表示
function showOverview() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    const section = appData.sections.overview;
    let contentHTML = `
        <div class="content-page">
            <h1>${section.title}</h1>
            <p class="description">${section.description}</p>
    `;
    
    section.content.forEach(item => {
        switch (item.type) {
            case 'heading':
                contentHTML += `<h2>${item.text}</h2>`;
                break;
            case 'paragraph':
                contentHTML += `<p>${item.text}</p>`;
                break;
            case 'list':
                contentHTML += `<ul>${item.items.map(i => `<li>${i}</li>`).join('')}</ul>`;
                break;
            case 'table':
                contentHTML += `
                    <table>
                        <thead>
                            <tr>${item.headers.map(h => `<th>${h}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${item.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                        </tbody>
                    </table>
                `;
                break;
        }
    });
    
    contentHTML += '</div>';
    mainContent.innerHTML = contentHTML;
}

// 準備業務を表示
function showPreparation() {
    showTasks('preparation', appData.sections.preparation);
}

// 当日運営を表示
function showDayOfEvent() {
    showTasks('dayOfEvent', appData.sections.dayOfEvent);
}

// 事後対応を表示
function showAfterEvent() {
    showTasks('afterEvent', appData.sections.afterEvent);
}

// タスクを表示（共通処理）
function showTasks(sectionKey, section) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    const tasksHTML = section.tasks.map(task => {
        const stepsHTML = task.steps.map((step, index) => 
            `<li>${step}</li>`
        ).join('');
        
        const notesHTML = task.notes ? 
            `<div class="task-notes">${task.notes}</div>` : '';
        
        return `
            <div class="task-item">
                <h3>${task.title}</h3>
                <ol class="steps-list">
                    ${stepsHTML}
                </ol>
                ${notesHTML}
            </div>
        `;
    }).join('');
    
    mainContent.innerHTML = `
        <div class="content-page">
            <h1>${section.title}</h1>
            <p class="description">${section.description}</p>
            ${tasksHTML}
        </div>
    `;
}

// トラブル対応を表示
function showTroubleshooting() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    const section = appData.sections.troubleshooting;
    const incidentsHTML = section.incidents.map(incident => {
        const stepsHTML = incident.steps.map(step => `<li>${step}</li>`).join('');
        const severityClass = incident.severity === '高' ? 'high' : 'medium';
        const severityText = incident.severity === '高' ? '高' : '中';
        
        return `
            <div class="incident-item severity-${severityClass}">
                <h3>${incident.title}</h3>
                <span class="severity-badge ${severityClass}">重要度: ${severityText}</span>
                <ol class="steps-list">
                    ${stepsHTML}
                </ol>
                ${incident.contact ? `<div class="incident-contact">連絡先: ${incident.contact}</div>` : ''}
            </div>
        `;
    }).join('');
    
    mainContent.innerHTML = `
        <div class="content-page">
            <h1>${section.title}</h1>
            <p class="description">${section.description}</p>
            ${incidentsHTML}
        </div>
    `;
}

// FAQを表示
function showFAQ() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    const section = appData.sections.faq;
    const faqHTML = section.items.map(item => `
        <div class="faq-item">
            <h3>${item.question}</h3>
            <p>${item.answer}</p>
        </div>
    `).join('');
    
    mainContent.innerHTML = `
        <div class="content-page">
            <h1>${section.title}</h1>
            <p class="description">${section.description}</p>
            ${faqHTML}
        </div>
    `;
}

// 外部資料リンクを表示
function showResources() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    const section = appData.sections.resources;
    const resourcesHTML = section.links.map(link => {
        const typeClass = link.type.toLowerCase();
        return `
            <a href="${link.url}" class="resource-item" target="_blank" rel="noopener noreferrer">
                <span class="resource-type ${typeClass}">${link.type}</span>
                <h3>${link.title}</h3>
                <p>${link.description}</p>
            </a>
        `;
    }).join('');
    
    mainContent.innerHTML = `
        <div class="content-page">
            <h1>${section.title}</h1>
            <p class="description">${section.description}</p>
            <div class="resource-list">
                ${resourcesHTML}
            </div>
        </div>
    `;
}

// エラーを表示
function showError(message) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="content-page">
            <h1>エラー</h1>
            <p style="color: #e74c3c;">${message}</p>
            <h2>よくある原因</h2>
            <ul>
              <li><strong>SharePointの設定で JSON / JS の取得がブロック</strong>（MIME / セキュリティ）</li>
              <li><strong>フォルダ構成が崩れている</strong>（<code>data/content.json</code> が見つからない）</li>
              <li><strong>ログインリダイレクト</strong>により JSON がHTMLとして返っている</li>
            </ul>
        </div>
    `;
}

function showLocalFileLoader(error) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const errText = error ? escapeHtml(String(error)) : '';
    mainContent.innerHTML = `
      <div class="content-page">
        <h1>ローカルで開いているため読み込めません（file://）</h1>
        <p class="description">
          ブラウザの仕様により <code>file://</code> から <code>fetch</code> で <code>data/content.json</code> を読むとCORSでブロックされます。<br>
          SharePoint（<code>https://</code>）に配置して開くのが本番想定です。
        </p>
        <h2>ローカルで確認したい場合（クリックだけでOK）</h2>
        <p>下のボタンから <code>handover/data/content.json</code> を選択してください。</p>
        <p>
          <input id="local-json-file" type="file" accept=\"application/json,.json\" />
        </p>
        ${error ? `<p style="color:#7f8c8d;font-size:12px;">参考: ${errText}</p>` : ''}
      </div>
    `;

    const input = document.getElementById('local-json-file');
    if (!(input instanceof HTMLInputElement)) return;

    input.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            appData = JSON.parse(text);
            buildNavigation();
            showTopPage();
            window.addEventListener('hashchange', handleHashChange);
            handleHashChange();
        } catch (e) {
            console.error('ローカルJSON読み込みエラー:', e);
            showError('選択したJSONの読み込みに失敗しました。正しい content.json を選択してください。');
        }
    });
}

function escapeHtml(input) {
    return String(input)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// アプリケーションを初期化
init();

