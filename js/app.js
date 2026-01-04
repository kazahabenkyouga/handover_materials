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
            <li style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #34495e;"><strong style="color: #95a5a6; font-size: 12px;">時系列で見る</strong></li>
            <li><a href="#timeline1Month" data-section="timeline1Month">${appData.sections.timeline1Month.title}</a></li>
            <li><a href="#timeline3Weeks" data-section="timeline3Weeks">${appData.sections.timeline3Weeks.title}</a></li>
            <li><a href="#timeline2Weeks" data-section="timeline2Weeks">${appData.sections.timeline2Weeks.title}</a></li>
            <li><a href="#timelineWeek" data-section="timelineWeek">${appData.sections.timelineWeek.title}</a></li>
            <li><a href="#timelineDay" data-section="timelineDay">${appData.sections.timelineDay.title}</a></li>
            <li><a href="#timelineAfter" data-section="timelineAfter">${appData.sections.timelineAfter.title}</a></li>
            <li style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #34495e;"></li>
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
        case 'timeline1Month':
            showTimeline1Month();
            break;
        case 'timeline3Weeks':
            showTimeline3Weeks();
            break;
        case 'timeline2Weeks':
            showTimeline2Weeks();
            break;
        case 'timelineWeek':
            showTimelineWeek();
            break;
        case 'timelineDay':
            showTimelineDay();
            break;
        case 'timelineAfter':
            showTimelineAfter();
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
    
    // タイムラインを表示
    const timelineHTML = showTimeline();
    
    mainContent.innerHTML = `
        <div class="top-page">
            <h1>${appData.siteTitle}</h1>
            <p class="description">${appData.siteDescription}</p>
            ${timelineHTML}
        </div>
    `;
    
    // タイムラインリンククリックイベント
    mainContent.querySelectorAll('.timeline-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
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

// 時系列セクション表示関数
function showTimeline1Month() {
    showChecklistTasks('timeline1Month', appData.sections.timeline1Month);
}

function showTimeline3Weeks() {
    showChecklistTasks('timeline3Weeks', appData.sections.timeline3Weeks);
}

function showTimeline2Weeks() {
    showChecklistTasks('timeline2Weeks', appData.sections.timeline2Weeks);
}

function showTimelineWeek() {
    showChecklistTasks('timelineWeek', appData.sections.timelineWeek);
}

function showTimelineDay() {
    showChecklistTasks('timelineDay', appData.sections.timelineDay);
}

function showTimelineAfter() {
    showChecklistTasks('timelineAfter', appData.sections.timelineAfter);
}

// チェックリスト形式でタスクを表示
function showChecklistTasks(sectionKey, section) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    const tasksHTML = section.tasks.map((task, taskIndex) => {
        const stepsHTML = task.steps.map((step, stepIndex) => 
            `<li>
                <input type="checkbox" id="task-${sectionKey}-${taskIndex}-step-${stepIndex}" />
                <label for="task-${sectionKey}-${taskIndex}-step-${stepIndex}">${step}</label>
            </li>`
        ).join('');
        
        const deadlineHTML = task.deadline ? `<span class="task-meta-item"><strong>期限:</strong> ${task.deadline}</span>` : '';
        const contactHTML = task.contact && task.contact !== '-' ? `<span class="task-meta-item"><strong>連絡先:</strong> ${task.contact}</span>` : '';
        
        const metaHTML = (deadlineHTML || contactHTML) ? 
            `<div class="task-meta">${deadlineHTML}${contactHTML}</div>` : '';
        
        const notesHTML = task.notes ? 
            `<div class="task-notes">${task.notes}</div>` : '';
        
        const referencesHTML = task.references && task.references.length > 0 ? 
            `<div class="task-references">
                <h4 class="references-title">参考資料</h4>
                <ul class="references-list">
                    ${task.references.map(ref => {
                        const typeClass = ref.type ? ref.type.toLowerCase() : 'file';
                        return `
                            <li class="reference-item">
                                <a href="${ref.url}" target="_blank" rel="noopener noreferrer" class="reference-link">
                                    <span class="reference-type ${typeClass}">${ref.type || 'ファイル'}</span>
                                    <span class="reference-name">${ref.name}</span>
                                </a>
                            </li>
                        `;
                    }).join('')}
                </ul>
            </div>` : '';
        
        return `
            <div class="checklist-task">
                <div class="checklist-task-header">
                    <h3>${task.title}</h3>
                </div>
                ${metaHTML}
                <ol class="checklist-steps">
                    ${stepsHTML}
                </ol>
                ${notesHTML}
                ${referencesHTML}
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

// タイムラインを表示（トップページ用）
function showTimeline() {
    const timelineItems = [
        { period: '1ヶ月前', section: 'timeline1Month', title: appData.sections.timeline1Month.title },
        { period: '3週間前', section: 'timeline3Weeks', title: appData.sections.timeline3Weeks.title },
        { period: '2週間前', section: 'timeline2Weeks', title: appData.sections.timeline2Weeks.title },
        { period: '開催週', section: 'timelineWeek', title: appData.sections.timelineWeek.title },
        { period: '当日', section: 'timelineDay', title: appData.sections.timelineDay.title },
        { period: '終了後', section: 'timelineAfter', title: appData.sections.timelineAfter.title }
    ];
    
    const timelineHTML = timelineItems.map((item, index) => {
        const section = appData.sections[item.section];
        const tasksList = section.tasks.map(task => `<li>${task.title}</li>`).join('');
        
        return `
        <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <div class="timeline-period">${item.period}</div>
                <a href="#${item.section}" class="timeline-link" data-section="${item.section}">${item.title}</a>
                <ul class="timeline-tasks">
                    ${tasksList}
                </ul>
            </div>
            ${index < timelineItems.length - 1 ? '<div class="timeline-connector"></div>' : ''}
        </div>
    `;
    }).join('');
    
    return `
        <div class="timeline-container">
            <h2 style="margin-bottom: 30px;">時系列スケジュール</h2>
            <div class="timeline">
                ${timelineHTML}
            </div>
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

