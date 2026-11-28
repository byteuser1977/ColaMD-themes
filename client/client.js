/**
 * ColaMD Themes —— DSH 客户端插件（预览版 UI）。
 *
 * 两处界面：
 *  1. `conversation.input.left`：输入框工具行左侧的主题选择胶囊，点开后是
 *     主题样例卡片网格（缩略图用主题自己的种子色绘制）；
 *  2. 右侧边栏的 `colamd-themes-preview` 页：用 iframe 承载宿主
 *     `/api/bytechain/colamd-themes/preview` 生成的独立文档，逐个试看主题。
 *
 * 手写而非打包：只依赖平台模块表里的 `react`，因此不需要构建步骤，安装后
 * 立即生效（`dsh.client.immediately`）。
 */

window.__ModuleLoader__.load({
  id: '@bytechain.cn/colamd-themes',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'colamd-themes';
    const API_BASE = '/api/bytechain/colamd-themes';
    const PICKER_SLOT = 'conversation.input.left';
    const PICKER_ID = 'colamd-theme-picker';
    const TAB_KIND = 'colamd-themes-preview';
    const TAB_ID = '@bytechain.cn/colamd-themes:preview';
    const DOC_ID = '@bytechain.cn/colamd-themes/document';
    const DOC_EXTENSIONS = ['md', 'markdown', 'mdx'];
    const INJECT = ['slots', 'locale', 'sidebarRight', 'sidebarRightTabs', 'documentPreviews'];

    /* ─────────────────────────── 文案 ─────────────────────────── */

    const ZH = {
      chip: '主题',
      panelTitle: 'Markdown 主题',
      search: '搜索主题…',
      groupAll: '全部',
      groupLight: '浅色',
      groupDark: '深色',
      groupWarm: '暖调',
      groupCool: '冷调',
      groupNeutral: '中性',
      groupCore: '内置',
      badgeCore: '内置',
      empty: '没有匹配的主题',
      loading: '正在读取主题目录…',
      failed: '主题目录加载失败',
      hint: '选择后导出默认使用该主题',
      openPreview: '在侧边栏预览',
      previewTab: '主题预览',
      guideTitle: '主题预览',
      guideDesc: '逐个试看 ColaMD 主题的正文、表格与代码块观感',
      narrow: '窄栏',
      wide: '宽栏',
      reload: '重新加载',
      prev: '上一个主题',
      next: '下一个主题',
      current: '当前主题',
      docRenderer: 'ColaMD 主题',
      docFailed: 'ColaMD 渲染失败',
      modeDoc: '文稿',
      modeSlides: '幻灯片',
      modeDocHint: '按文档排版渲染',
      modeSlidesHint: '按 16:9 幻灯片渲染',
      exportLabel: '导出',
      exportPdfDoc: '文档 PDF（A4）',
      exportPdfSlides: '幻灯片 PDF（16:9）',
      exportDocx: 'Word 文档（.docx）',
      exportPptx: '幻灯片 PPT（.pptx）',
      exportHintDoc: '按当前主题的文稿排版导出 A4 PDF 或 Word',
      exportHintSlides: '按当前主题的幻灯片排版导出 16:9 PDF；PPTX 为尽力还原',
      exportHint: '导出为幻灯片 PDF（16:9）、文档 PDF（A4）或 Word，排版与页面一致',
      exporting: '正在生成…',
      exportFailed: '导出失败',
      present: '全屏',
      presentHint: '在独立窗口里全屏预览（幻灯片可用 ←/→ 翻页、F 全屏）',
      popupBlocked: '浏览器拦截了弹出窗口，请允许本页面弹窗后重试',
    };

    const EN = {
      chip: 'Theme',
      panelTitle: 'Markdown themes',
      search: 'Search themes…',
      groupAll: 'All',
      groupLight: 'Light',
      groupDark: 'Dark',
      groupWarm: 'Warm',
      groupCool: 'Cool',
      groupNeutral: 'Neutral',
      groupCore: 'Built-in',
      badgeCore: 'Built-in',
      empty: 'No matching themes',
      loading: 'Loading theme catalog…',
      failed: 'Failed to load the theme catalog',
      hint: 'Used by default when exporting',
      openPreview: 'Preview in sidebar',
      previewTab: 'Theme preview',
      guideTitle: 'Theme preview',
      guideDesc: 'Try ColaMD typing, tables and code blocks theme by theme',
      narrow: 'Narrow',
      wide: 'Wide',
      reload: 'Reload',
      prev: 'Previous theme',
      next: 'Next theme',
      current: 'Current theme',
      docRenderer: 'ColaMD theme',
      docFailed: 'ColaMD render failed',
      modeDoc: 'Document',
      modeSlides: 'Slides',
      modeDocHint: 'Render as a document',
      modeSlidesHint: 'Render as 16:9 slides',
      exportLabel: 'Export',
      exportPdfDoc: 'Document PDF (A4)',
      exportPdfSlides: 'Slide PDF (16:9)',
      exportDocx: 'Word document (.docx)',
      exportPptx: 'Slide PPT (.pptx)',
      exportHintDoc: 'Export the themed document layout as an A4 PDF or Word file',
      exportHintSlides: 'Export the themed slide layout as a 16:9 PDF; PPTX is best-effort',
      exportHint: 'Export a slide PDF (16:9), a document PDF (A4) or Word — laid out exactly like the page',
      exporting: 'Generating…',
      exportFailed: 'Export failed',
      present: 'Present',
      presentHint: 'Open a full-screen preview window (slides: ←/→ to page, F to fullscreen)',
      popupBlocked: 'The popup was blocked — allow popups for this page and try again',
    };

    /* ─────────────────────────── 工具 ─────────────────────────── */

    /** 把 `/api/...` 解析成相对 `document.baseURI` 的绝对地址。 */
    function resolveApiUrl(pathname) {
      try {
        const base = new URL(document.baseURI);
        const dir = base.pathname.replace(/[^/]*$/, '');
        return new URL(pathname.replace(/^\//, ''), base.origin + dir).href;
      } catch {
        return pathname;
      }
    }

    const store = {
      state: {
        status: 'idle',
        error: '',
        themes: [],
        selected: '',
        savedAt: 0,
        query: '',
        group: 'all',
        open: false,
        notice: '',
        mode: 'document',
        exporting: '',
        presentUrl: '',
      },
      listeners: new Set(),
      subscribe(listener) {
        store.listeners.add(listener);
        return () => store.listeners.delete(listener);
      },
      get() {
        return store.state;
      },
      patch(next) {
        store.state = Object.assign({}, store.state, next);
        for (const listener of Array.from(store.listeners)) {
          try {
            listener();
          } catch (e) {
            console.warn('[colamd-themes] store listener failed', e);
          }
        }
      },
    };

    function useStore() {
      const [snapshot, setSnapshot] = React.useState(store.get());
      React.useEffect(() => store.subscribe(() => setSnapshot(store.get())), []);
      return snapshot;
    }

    /** 行内提示：失败原因要看得见，不然点了没反应就无从判断。6 秒后自动消失。 */
    function Notice() {
      const state = useStore();
      const text = state.notice;
      React.useEffect(() => {
        if (!text) return undefined;
        const timer = setTimeout(() => store.patch({ notice: '' }), 6000);
        return () => clearTimeout(timer);
      }, [text]);
      if (!text) return null;
      return h('span', { className: 'ct-notice', 'data-colamd-notice': '', title: text }, text);
    }

    let catalogPromise = null;

    function loadCatalog() {
      if (store.get().status === 'ready' || catalogPromise !== null) return catalogPromise || Promise.resolve();
      store.patch({ status: 'loading', error: '' });
      catalogPromise = fetch(resolveApiUrl(API_BASE + '/catalog'), { headers: { accept: 'application/json' } })
        .then((response) => {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.json();
        })
        .then((data) => {
          store.patch({
            status: 'ready',
            themes: Array.isArray(data.themes) ? data.themes : [],
            selected: typeof data.selected === 'string' ? data.selected : '',
          });
        })
        .catch((error) => {
          store.patch({ status: 'error', error: (error && error.message) || String(error) });
        })
        .finally(() => {
          catalogPromise = null;
        });
      return catalogPromise;
    }

    /** 宿主句柄：`apply` 时捕获，供非组件代码（如卡片点击）打开侧边栏。 */
    let host = null;

    function selectTheme(id) {
      const previous = store.get().selected;
      store.patch({ selected: id, savedAt: Date.now() });
      return fetch(resolveApiUrl(API_BASE + '/selection'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ theme: id }),
      })
        .then((response) => {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.json();
        })
        .catch((error) => {
          store.patch({ selected: previous, notice: (error && error.message) || String(error) });
        });
    }

    function openPreview() {
      const right = host && host.sidebarRight;
      if (!right) return;
      try {
        if (typeof right.isExpanded === 'function' && right.isExpanded() === false) right.toggleExpanded();
        right.openTab(TAB_KIND, { revealIfOpened: true });
      } catch (error) {
        console.warn('[colamd-themes] sidebar preview unavailable', error);
      }
    }

    /* ─────────────────────────── 渲染模式与导出 ─────────────────────────── */

    /** 最近一次加载的文档正文与模式：文档标题栏里的导出 / 全屏按钮要用。 */
    let latestDoc = { markdown: '', title: '', mode: 'document' };

    /** 复用的演示页 token：重渲染只刷新内容，链接地址保持不变。 */
    let presentToken = '';

    /**
     * 把当前正文登记成宿主的演示页，拿到可寻址 URL。
     *
     * 关键：这个 URL 是**提前**登记好的，标题栏「全屏」因此可以是一个普通
     * `<a target="_blank">`——由用户自己的点击触发新窗口，不受弹窗拦截影响。
     */
    function registerPresent() {
      const state = store.get();
      const markdown = latestDoc.markdown;
      if (!markdown) return Promise.resolve('');
      const mode = state.mode === 'slides' ? 'slides' : 'document';
      return fetch(resolveApiUrl(API_BASE + '/present'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          markdown,
          theme: state.selected,
          mode,
          title: latestDoc.title || undefined,
          // 复用同一个 token：链接地址稳定，重渲染只刷新宿主里的内容与有效期。
          token: presentToken || undefined,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (!data || data.ok !== true || typeof data.url !== 'string') {
            throw new Error((data && data.error) || 'present-failed');
          }
          if (typeof data.token === 'string' && data.token) presentToken = data.token;
          const url = resolveApiUrl(data.url);
          store.patch({ presentUrl: url });
          return url;
        })
        .catch((error) => {
          console.warn('[colamd-themes] present register failed', error);
          store.patch({ presentUrl: '', notice: pick(tDict, 'failed') + '：' + ((error && error.message) || error) });
          return '';
        });
    }

    let presentTimer = null;

    /** 正文/主题/模式变了就重新登记（防抖），保证「全屏」链接始终指向最新一版。 */
    function schedulePresent() {
      if (presentTimer) clearTimeout(presentTimer);
      presentTimer = setTimeout(() => {
        presentTimer = null;
        void registerPresent();
      }, 400);
    }

    /** 主题预览页签的独立窗口预览：宿主按当前主题现渲染示例文档。 */
    function presentPreviewUrl() {
      const state = store.get();
      const query = [
        'theme=' + encodeURIComponent(state.selected || ''),
        'mode=' + (state.mode === 'slides' ? 'slides' : 'document'),
      ].join('&');
      return resolveApiUrl(API_BASE + '/present?' + query);
    }

    /**
     * 演示层：全屏浮层 + 同源 iframe。
     *
     * 不再依赖 `window.open`（DSH 外壳的 `setWindowOpenHandler` 会拦掉），也不
     * 依赖新窗口自带的登录态——浮层是本页面的子节点，iframe 走的是同一份
     * cookie/session，因此一定能取到宿主渲染好的页面。
     */
    let presentOverlay = null;

    function closePresentOverlay() {
      const host = presentOverlay;
      presentOverlay = null;
      if (!host) return;
      try {
        if (host.__cleanup) host.__cleanup();
      } catch (error) {
        /* 清理失败不影响退出 */
      }
      if (typeof document.exitFullscreen === 'function' && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
      if (host.parentNode) host.parentNode.removeChild(host);
    }

    function openPresentOverlay(url) {
      if (typeof url !== 'string' || url === '') return;
      closePresentOverlay();
      const host = document.createElement('div');
      host.setAttribute('data-colamd-present-overlay', '');
      host.style.cssText =
        'position:fixed;inset:0;z-index:2147483000;background:#0b0b0c;display:block;margin:0;padding:0;';
      const frame = document.createElement('iframe');
      frame.setAttribute('data-colamd-present-frame', '');
      frame.setAttribute('allow', 'fullscreen');
      frame.setAttribute('allowfullscreen', '');
      frame.setAttribute('title', pick(tDict, 'present'));
      frame.style.cssText = 'width:100%;height:100%;border:0;display:block;background:#0b0b0c;';
      frame.src = url;
      host.appendChild(frame);
      const onKey = (event) => {
        if (event.key === 'Escape') closePresentOverlay();
      };
      const onFullscreenChange = () => {
        if (!document.fullscreenElement) closePresentOverlay();
      };
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('fullscreenchange', onFullscreenChange);
      host.__cleanup = () => {
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('fullscreenchange', onFullscreenChange);
      };
      document.body.appendChild(host);
      presentOverlay = host;
      // 兜底：8 秒还没加载出来就告诉用户发生了什么，而不是留一块黑屏。
      const guard = setTimeout(() => {
        if (!host.isConnected) return;
        if (host.getAttribute('data-colamd-present-loaded') === '1') return;
        const tip = document.createElement('div');
        tip.setAttribute('data-colamd-present-fallback', '');
        tip.style.cssText =
          'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;' +
          'font:13px/1.7 system-ui,sans-serif;color:#f2f2f2;text-align:center;' +
          'background:#0b0b0c;z-index:1;';
        tip.textContent = pick(tDict, 'presentFallback') + ' ' + url;
        host.appendChild(tip);
      }, 8000);
      frame.addEventListener('load', () => {
        host.setAttribute('data-colamd-present-loaded', '1');
        clearTimeout(guard);
      });
      const request = host.requestFullscreen || host.webkitRequestFullscreen;
      if (typeof request === 'function') {
        try {
          const result = request.call(host);
          if (result && typeof result.catch === 'function') result.catch(() => {});
        } catch (error) {
          /* 全屏被拒时浮层仍然铺满窗口 */
        }
      }
    }

    /** 打开演示层：先确保宿主已经登记好这一份正文，再铺满窗口。 */
    function presentNow(fallbackUrl) {
      const state = store.get();
      if (state.presentUrl) {
        openPresentOverlay(state.presentUrl);
        return;
      }
      store.patch({ notice: pick(tDict, 'loading') });
      void registerPresent().then((url) => {
        openPresentOverlay(url || fallbackUrl || '');
      });
    }

    /** 从资源地址推文件基名，「README_CN.md」→「README_CN」，用作导出文件名。 */
    function documentTitle(props) {
      const address = props && (props.resourceAddress || props.absolutePath);
      const raw = typeof address === 'string' ? address : '';
      const name = raw.split(/[\\/]/).pop() || '';
      return name.replace(/\.[A-Za-z0-9]+$/, '') || name;
    }

    function setMode(mode) {
      store.patch({ mode: mode === 'slides' ? 'slides' : 'document' });
    }

    function triggerDownload(blob, filename) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    /** 命中宿主的 `/export`，取回二进制并触发下载；失败时把原因写进 notice。 */
    function exportFile(format, mode) {
      const state = store.get();
      if (state.exporting) return Promise.resolve();
      const markdown = latestDoc.markdown;
      if (!markdown) {
        store.patch({ notice: pick(tDict, 'loading') });
        return Promise.resolve();
      }
      // 幻灯片 PDF 与文稿 PDF 用同一个 format，区别只在 mode；缺省跟随当前视图。
      const targetMode = mode === 'slides' || mode === 'document' ? mode : state.mode;
      store.patch({ exporting: format, notice: '' });
      return fetch(resolveApiUrl(API_BASE + '/export'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: '*/*' },
        body: JSON.stringify({
          format: format,
          mode: targetMode,
          markdown: markdown,
          theme: state.selected || undefined,
          title: latestDoc.title || undefined,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then(
              (data) => {
                throw new Error((data && (data.error || data.message)) || 'HTTP ' + response.status);
              },
              () => {
                throw new Error('HTTP ' + response.status);
              }
            );
          }
          const disposition =
            (response.headers && typeof response.headers.get === 'function' && response.headers.get('content-disposition')) || '';
          const match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
          const fallback = /filename="([^"]+)"/i.exec(disposition);
          const filename = match
            ? decodeURIComponent(match[1])
            : fallback
              ? fallback[1]
              : (latestDoc.title || 'colamd') + '.' + (mode === 'slides' && format === 'pdf' ? 'slides.pdf' : format);
          return response.blob().then((blob) => triggerDownload(blob, filename));
        })
        .catch((error) => {
          console.warn('[colamd-themes] export failed:', error);
          store.patch({ notice: pick(tDict, 'exportFailed') + '：' + ((error && error.message) || error) });
        })
        .finally(() => {
          store.patch({ exporting: '' });
        });
    }

    /** 「文稿 / 幻灯片」切换：文档预览与主题预览页签共用同一份状态。 */
    function ModeToggle(props) {
      const t = props && props.t;
      const mode = (props && props.mode) || 'document';
      const slides = mode === 'slides';
      return h(
        'button',
        {
          type: 'button',
          className: slides ? 'ct-doc-chip ct-doc-chip-on' : 'ct-doc-chip',
          title: slides ? pick(t, 'modeSlidesHint') : pick(t, 'modeDocHint'),
          'data-colamd-chip': 'mode',
          'aria-pressed': slides ? 'true' : 'false',
          onClick: () => {
            setMode(slides ? 'document' : 'slides');
          },
        },
        h(slides ? SlidesIcon : DocIcon, { size: 12 }),
        h('span', { className: 'ct-doc-chip-name' }, pick(t, slides ? 'modeSlides' : 'modeDoc'))
      );
    }

    /** 导出菜单：幻灯片 PDF / 文档 PDF / Word 三选一，生成期间禁用并显示进度。 */
    function ExportMenu(props) {
      const t = props && props.t;
      const state = useStore();
      const [open, setOpen] = React.useState(false);
      const rootRef = React.useRef(null);

      React.useEffect(() => {
        if (!open) return undefined;
        const onPointer = (event) => {
          const target = event.target;
          if (rootRef.current && rootRef.current.contains(target)) return;
          setOpen(false);
        };
        const onKey = (event) => {
          if (event.key === 'Escape') setOpen(false);
        };
        window.addEventListener('mousedown', onPointer, true);
        window.addEventListener('keydown', onKey);
        return () => {
          window.removeEventListener('mousedown', onPointer, true);
          window.removeEventListener('keydown', onKey);
        };
      }, [open]);

      const busy = state.exporting !== '';
      // 菜单跟着当前模式走：文稿给 A4 PDF 与 Word，幻灯片给 16:9 PDF 与 PPTX（PPTX 只是尽力还原）。
      const slides = state.mode === 'slides';
      const items = slides
        ? [
            ['pdf', 'slides', 'exportPdfSlides'],
            ['pptx', 'slides', 'exportPptx'],
          ]
        : [
            ['pdf', 'document', 'exportPdfDoc'],
            ['docx', 'document', 'exportDocx'],
          ];

      return h(
        'div',
        { className: 'ct-export', ref: rootRef },
        h(
          'button',
          {
            type: 'button',
            className: open ? 'ct-doc-chip ct-doc-chip-open' : 'ct-doc-chip',
            title: pick(t, state.mode === 'slides' ? 'exportHintSlides' : 'exportHintDoc'),
            'data-colamd-chip': 'export',
            'aria-haspopup': 'menu',
            'aria-expanded': open ? 'true' : 'false',
            disabled: busy,
            onClick: () => setOpen(!open),
          },
          h(DownloadIcon, { size: 12 }),
          h('span', { className: 'ct-doc-chip-name' }, busy ? pick(t, 'exporting') : pick(t, 'exportLabel'))
        ),
        open && !busy
          ? h(
              'div',
              { className: 'ct-export-menu', role: 'menu' },
              items.map(([format, mode, label]) =>
                h(
                  'button',
                  {
                    key: format + ':' + mode,
                    type: 'button',
                    role: 'menuitem',
                    className: 'ct-export-item',
                    'data-export-mode': mode,
                    onClick: () => {
                      setOpen(false);
                      exportFile(format, mode);
                    },
                  },
                  pick(t, label)
                )
              )
            )
          : null
      );
    }

    function matchesGroup(theme, group) {
      if (group === 'core') return theme.group === 'core';
      if (group === 'light' || group === 'dark') return theme.tone === group;
      if (group === 'warm' || group === 'cool') return theme.accent === group;
      return true;
    }

    function filterThemes(themes, query, group) {
      const needle = query.trim().toLowerCase();
      return themes.filter((theme) => {
        if (!matchesGroup(theme, group)) return false;
        if (needle === '') return true;
        const haystack = [theme.id, theme.title, theme.subtitle, theme.description]
          .join(' ')
          .toLowerCase();
        return haystack.indexOf(needle) !== -1;
      });
    }

    function themeById(themes, id) {
      for (const theme of themes) if (theme.id === id) return theme;
      return undefined;
    }

    /** 没有副标题时用「明暗 · 色温」补位，卡片不至于空一行。 */
    function toneLabel(t, theme) {
      const tone = theme.tone === 'dark' ? t('groupDark') : t('groupLight');
      const accent =
        theme.accent === 'warm' ? t('groupWarm') : theme.accent === 'cool' ? t('groupCool') : t('groupNeutral');
      return tone + ' · ' + accent;
    }

    /* ─────────────────────────── 图标 ─────────────────────────── */

    function PaletteIcon(props) {
      const size = (props && props.size) || 14;
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.35,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        },
        h('rect', { x: 1.6, y: 1.6, width: 12.8, height: 12.8, rx: 3 }),
        h('path', { d: 'M4.4 10.2 8 4.4l3.6 5.8' }),
        h('circle', { cx: 8, cy: 11.4, r: 0.9, fill: 'currentColor', stroke: 'none' })
      );
    }

    function ChevronIcon(props) {
      const up = props && props.up;
      return h(
        'svg',
        {
          width: 10,
          height: 10,
          viewBox: '0 0 10 10',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          style: up ? { transform: 'rotate(180deg)' } : undefined,
        },
        h('path', { d: 'M2.2 6.2 5 3.4l2.8 2.8' })
      );
    }

    /** 22×16 版面里的文档图标：标题栏里跟主题胶囊同一尺寸。 */
    function DocIcon(props) {
      const size = (props && props.size) || 12;
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 12 12',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        },
        h('path', { d: 'M3 1.6h4l2 2v6.8H3z' }),
        h('path', { d: 'M7 1.6v2h2' }),
        h('path', { d: 'M4.4 5.4h3.2M4.4 7.4h3.2' })
      );
    }

    /** 幻灯片图标：16:9 画面 + 底条。 */
    function SlidesIcon(props) {
      const size = (props && props.size) || 12;
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 12 12',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        },
        h('rect', { x: '1.4', y: '2.6', width: '9.2', height: '5.6', rx: '1' }),
        h('path', { d: 'M4 10.2h4' })
      );
    }

    /** 下载图标：向下箭头 + 托盘。 */
    function DownloadIcon(props) {
      const size = (props && props.size) || 12;
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 12 12',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        },
        h('path', { d: 'M6 1.8v5.4' }),
        h('path', { d: 'M3.6 5 6 7.4 8.4 5' }),
        h('path', { d: 'M2 9.4h8' })
      );
    }

    /** 独立窗口图标：四角外扩。 */
    function ExpandIcon(props) {
      const size = (props && props.size) || 12;
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 12 12',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        },
        h('path', { d: 'M2 4.4V2h2.4M10 4.4V2H7.6M2 7.6V10h2.4M10 7.6V10H7.6' })
      );
    }

    /* ─────────────────────────── 缩略图 ─────────────────────────── */

    function thumbStyle(theme) {
      const tokens = theme.tokens || {};
      const surface = tokens.surface || (theme.tone === 'dark' ? '#17181c' : '#f6f5f2');
      const panel = tokens.panel || surface;
      return { background: surface, borderColor: tokens.border || 'rgba(0,0,0,0.12)', color: tokens.ink || '#262626', panel: panel };
    }

    function Thumbnail(props) {
      const theme = props.theme;
      const paint = thumbStyle(theme);
      const accent = (theme.tokens && theme.tokens.accent) || '#b0401f';
      const muted = (theme.tokens && theme.tokens.inkMuted) || paint.color;
      return h(
        'div',
        { className: 'ct-thumb', style: { background: paint.background, borderColor: paint.borderColor } },
        h('div', { className: 'ct-thumb-accent', style: { background: accent } }),
        h('div', { className: 'ct-thumb-title', style: { color: paint.color } }, 'Aa'),
        h('div', { className: 'ct-thumb-line', style: { background: muted, opacity: 0.55, width: '88%' } }),
        h('div', { className: 'ct-thumb-line', style: { background: muted, opacity: 0.38, width: '70%' } }),
        h(
          'div',
          { className: 'ct-thumb-code', style: { background: paint.panel, borderColor: paint.borderColor } },
          h('span', { style: { background: accent, opacity: 0.75 } }),
          h('span', { style: { background: muted, opacity: 0.45 } }),
          h('span', { style: { background: muted, opacity: 0.3 } })
        )
      );
    }

    /* ─────────────────────────── 选择面板 ─────────────────────────── */

    function GROUPS(t) {
      return [
        { id: 'all', label: t('groupAll') },
        { id: 'light', label: t('groupLight') },
        { id: 'dark', label: t('groupDark') },
        { id: 'warm', label: t('groupWarm') },
        { id: 'cool', label: t('groupCool') },
        { id: 'core', label: t('groupCore') },
      ];
    }

    function ThemeCard(props) {
      const theme = props.theme;
      const active = theme.id === props.selected;
      return h(
        'button',
        {
          type: 'button',
          className: active ? 'ct-card ct-card-active' : 'ct-card',
          onClick: () => props.onPick(theme.id),
          title: [theme.title, theme.subtitle, theme.description].filter(Boolean).join(' · '),
          'aria-pressed': active ? 'true' : 'false',
        },
        h(Thumbnail, { theme: theme }),
        h(
          'span',
          { className: 'ct-card-meta' },
          h('span', { className: 'ct-card-name' }, theme.title),
          h('span', { className: 'ct-card-sub' }, theme.subtitle || props.sub || '')
        ),
        theme.group === 'core'
          ? h('span', { className: 'ct-card-badge' }, props.badge || 'core')
          : null,
        active ? h('span', { className: 'ct-card-check' }, '✓') : null
      );
    }

    function ThemePanel(props) {
      const state = props.state;
      const t = props.t;
      const anchor = props.anchor;
      const list = filterThemes(state.themes, state.query, state.group);
      const panelWidth = anchor.width;
      const panelRef = React.useRef(null);
      /* 关闭与选卡都可由宿主覆盖：输入框胶囊用全局 store，文档标题栏用各自的局部状态。 */
      const close = () => (typeof props.onClose === 'function' ? props.onClose() : store.patch({ open: false }));
      const pickTheme =
        typeof props.onPick === 'function'
          ? props.onPick
          : (id) => {
              selectTheme(id);
              close();
              openPreview();
            };
      const panelStyle = { left: anchor.left + 'px', width: panelWidth + 'px' };
      if (typeof anchor.top === 'number') panelStyle.top = anchor.top + 'px';
      else panelStyle.bottom = anchor.bottom + 'px';

      /* 顶层层（Popover API）渲染，避免被输入框区域的 transform/overflow 裁剪。 */
      React.useEffect(() => {
        const node = panelRef.current;
        if (!node || typeof node.showPopover !== 'function') return undefined;
        let shown = false;
        try {
          node.showPopover();
          shown = true;
        } catch (error) {
          shown = false;
        }
        return () => {
          if (!shown) return;
          try {
            node.hidePopover();
          } catch (error) {
            /* 已关闭或元素已卸载 */
          }
        };
      }, []);

      const header = h(
        'div',
        { className: 'ct-panel-head' },
        h('span', { className: 'ct-panel-title' }, t('panelTitle')),
        h('input', {
          className: 'ct-search',
          type: 'search',
          value: state.query,
          placeholder: t('search'),
          onChange: (event) => store.patch({ query: event.target.value }),
          spellCheck: false,
        })
      );

      const groups = h(
        'div',
        { className: 'ct-groups' },
        GROUPS(t).map((group) =>
          h(
            'button',
            {
              key: group.id,
              type: 'button',
              className: state.group === group.id ? 'ct-group ct-group-active' : 'ct-group',
              onClick: () => store.patch({ group: group.id }),
            },
            group.label
          )
        )
      );

      let body;
      if (state.status === 'error') {
        body = h('div', { className: 'ct-empty ct-error' }, t('failed') + '：' + state.error);
      } else if (state.status !== 'ready') {
        body = h('div', { className: 'ct-empty' }, t('loading'));
      } else if (list.length === 0) {
        body = h('div', { className: 'ct-empty' }, t('empty'));
      } else {
        body = h(
          'div',
          { className: 'ct-grid' },
          list.map((theme) =>
            h(ThemeCard, {
              key: theme.id,
              theme: theme,
              sub: toneLabel(t, theme),
              badge: t('badgeCore'),
              selected: state.selected,
              onPick: pickTheme,
            })
          )
        );
      }

      return h(
        'div',
        {
          ref: panelRef,
          className: 'ct-panel',
          popover: 'manual',
          style: panelStyle,
          role: 'dialog',
          'aria-label': t('panelTitle'),
          onMouseDown: (event) => event.stopPropagation(),
        },
        header,
        groups,
        body,
        h(
          'div',
          { className: 'ct-panel-foot' },
          h('span', { className: 'ct-foot-hint' }, state.themes.length ? t('hint') + ' · ' + state.themes.length : t('hint')),
          h(
            'button',
            {
              type: 'button',
              className: 'ct-foot-action',
              onClick: () => {
                close();
                openPreview();
              },
            },
            t('openPreview')
          )
        )
      );
    }

    /* ─────────────────────────── 输入框胶囊 ─────────────────────────── */

    function ThemePicker() {
      const t = (key) => pick(tDict, key);
      const state = useStore();
      const buttonRef = React.useRef(null);
      const [anchor, setAnchor] = React.useState(null);

      React.useEffect(() => {
        loadCatalog();
      }, []);

      const measure = React.useCallback(() => {
        const node = buttonRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const width = Math.max(320, Math.min(588, window.innerWidth - 24));
        const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
        const bottom = Math.max(12, window.innerHeight - rect.top + 10);
        setAnchor({ left: left, bottom: bottom, width: width });
      }, []);

      const open = state.open;
      React.useEffect(() => {
        if (!open) return undefined;
        measure();
        const onPointer = (event) => {
          const target = event.target;
          if (target && typeof target.closest === 'function' && target.closest('.ct-panel')) return;
          if (buttonRef.current && buttonRef.current.contains(target)) return;
          store.patch({ open: false });
        };
        const onKey = (event) => {
          if (event.key === 'Escape') store.patch({ open: false });
        };
        window.addEventListener('mousedown', onPointer, true);
        window.addEventListener('keydown', onKey);
        window.addEventListener('resize', measure);
        return () => {
          window.removeEventListener('mousedown', onPointer, true);
          window.removeEventListener('keydown', onKey);
          window.removeEventListener('resize', measure);
        };
      }, [open, measure]);

      const current = themeById(state.themes, state.selected);
      const label = current ? current.title : '';

      return h(
        'div',
        { className: 'ct-root' },
        h(
          'button',
          {
            ref: buttonRef,
            type: 'button',
            className: open ? 'ct-chip ct-chip-open' : 'ct-chip',
            onClick: () => {
              if (open) {
                store.patch({ open: false });
                return;
              }
              loadCatalog();
              measure();
              store.patch({ open: true });
            },
            title: t('panelTitle'),
            'aria-haspopup': 'dialog',
            'aria-expanded': open ? 'true' : 'false',
          },
          h(PaletteIcon, { size: 13 }),
          h('span', { className: 'ct-chip-label' }, t('chip')),
          label ? h('span', { className: 'ct-chip-name' }, label) : null,
          h(ChevronIcon, { up: open })
        ),
        open && anchor !== null ? h(ThemePanel, { state: state, t: t, anchor: anchor }) : null
      );
    }

    /* ─────────────────────────── 侧边栏预览页 ─────────────────────────── */

    function previewUrl(state, theme, narrow, stamp) {
      const query = ['theme=' + encodeURIComponent(theme)];
      if (narrow) query.push('width=520');
      if (state && state.mode === 'slides') query.push('mode=slides');
      if (stamp) query.push('v=' + stamp);
      return resolveApiUrl(API_BASE + '/preview?' + query.join('&'));
    }

    function PreviewBody() {
      const t = (key) => pick(tDict, key);
      const state = useStore();
      const [narrow, setNarrow] = React.useState(false);
      const [stamp, setStamp] = React.useState(() => Date.now());

      React.useEffect(() => {
        loadCatalog();
      }, []);

      React.useEffect(() => {
        setStamp(Date.now());
      }, [state.selected, state.mode]);

      const list = filterThemes(state.themes, '', 'all');
      const index = list.findIndex((theme) => theme.id === state.selected);
      const current = index >= 0 ? list[index] : themeById(state.themes, state.selected);
      const step = (delta) => {
        if (list.length === 0) return;
        const next = list[(Math.max(0, index) + delta + list.length) % list.length];
        if (next) selectTheme(next.id);
      };

      const toolbar = h(
        'div',
        { className: 'ct-pv-bar' },
        h('span', { className: 'ct-pv-name' }, current ? current.title : state.selected || '—'),
        current && current.subtitle ? h('span', { className: 'ct-pv-sub' }, current.subtitle) : null,
        h(ModeToggle, { t: t, mode: state.mode }),
        h(Notice, null),
        h('span', { className: 'ct-pv-spacer' }),
        h(
          'button',
          {
            type: 'button',
            className: 'ct-pv-btn',
            title: t('presentHint'),
            'data-colamd-present-btn': 'preview',
            onClick: () => presentNow(presentPreviewUrl()),
          },
          h(ExpandIcon, { size: 12 })
        ),
        h('button', { type: 'button', className: 'ct-pv-btn', onClick: () => step(-1), title: t('prev') }, '‹'),
        h('button', { type: 'button', className: 'ct-pv-btn', onClick: () => step(1), title: t('next') }, '›'),
        h(
          'button',
          {
            type: 'button',
            className: narrow ? 'ct-pv-btn ct-pv-btn-on' : 'ct-pv-btn',
            onClick: () => setNarrow(!narrow),
            title: narrow ? t('wide') : t('narrow'),
          },
          '▭'
        ),
        h('button', { type: 'button', className: 'ct-pv-btn', onClick: () => setStamp(Date.now()), title: t('reload') }, '⟳')
      );

      let frame;
      if (state.status === 'error') {
        frame = h('div', { className: 'ct-empty ct-error' }, t('failed') + '：' + state.error);
      } else if (state.status !== 'ready' || !state.selected) {
        frame = h('div', { className: 'ct-empty' }, t('loading'));
      } else {
        frame = h('iframe', {
          className: 'ct-frame',
          title: t('previewTab'),
          src: previewUrl(state, state.selected, narrow, stamp),
        });
      }

      return h('div', { className: 'ct-pv' }, toolbar, frame);
    }

    /**
     * 文档预览标题栏里的主题选择器：与输入框胶囊同一套面板（搜索 + 分类分组 + 样例卡片）。
     *
     * 注册在 `sidebar.right.tab.document.action`（按渲染器 id 分键），因此只在
     * 「ColaMD 主题」这个实现被选中时出现在文档标题栏里；选中的主题写回同一份
     * 选择，托盘胶囊与预览页签同步更新，正文也会按新主题重渲染。
     *
     * 与输入框胶囊的区别只有定位和收尾：这里面板向**下**展开（标题栏在窗口顶部），
     * 选卡后只关闭面板、不再额外打开侧边栏预览页签（当前就在文档页签里）。
     */
    function DocumentThemeSwitch(props) {
      const state = useStore();
      const t = props && props.t;
      const buttonRef = React.useRef(null);
      const [anchor, setAnchor] = React.useState(null);
      const [open, setOpen] = React.useState(false);

      React.useEffect(() => {
        loadCatalog();
      }, []);

      const measure = React.useCallback(() => {
        const node = buttonRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const width = Math.max(320, Math.min(588, window.innerWidth - 24));
        const left = Math.max(12, Math.min(rect.left - 8, window.innerWidth - width - 12));
        const top = Math.min(rect.bottom + 8, Math.max(12, window.innerHeight - 220));
        setAnchor({ left: left, top: top, width: width });
      }, []);

      React.useEffect(() => {
        if (!open) return undefined;
        measure();
        const onPointer = (event) => {
          const target = event.target;
          if (target && typeof target.closest === 'function' && target.closest('.ct-panel')) return;
          if (buttonRef.current && buttonRef.current.contains(target)) return;
          setOpen(false);
        };
        const onKey = (event) => {
          if (event.key === 'Escape') setOpen(false);
        };
        window.addEventListener('mousedown', onPointer, true);
        window.addEventListener('keydown', onKey);
        window.addEventListener('resize', measure);
        return () => {
          window.removeEventListener('mousedown', onPointer, true);
          window.removeEventListener('keydown', onKey);
          window.removeEventListener('resize', measure);
        };
      }, [open, measure]);

      const current = themeById(state.themes, state.selected);
      const close = () => setOpen(false);

      return h(
        'div',
        { className: 'ct-doc-switch' },
        h(
          'button',
          {
            ref: buttonRef,
            type: 'button',
            className: open ? 'ct-doc-chip ct-doc-chip-open' : 'ct-doc-chip',
            title: t('panelTitle'),
            'data-colamd-chip': 'theme',
            'aria-haspopup': 'dialog',
            'aria-expanded': open ? 'true' : 'false',
            onClick: () => {
              if (open) {
                setOpen(false);
                return;
              }
              loadCatalog();
              measure();
              setOpen(true);
            },
          },
          h(PaletteIcon, { size: 12 }),
          h('span', { className: 'ct-doc-chip-name' }, current ? current.title : t('chip')),
          h(ChevronIcon, { up: open })
        ),
        open && anchor !== null
          ? h(ThemePanel, {
              state: state,
              t: t,
              anchor: anchor,
              onClose: close,
              onPick: (id) => {
                selectTheme(id);
                close();
              },
            })
          : null
      );
    }

    /**
     * 文档标题栏的完整工具条：文稿/幻灯片切换 + 主题胶囊 + 导出。
     *
     * 三者共用同一个 keyed 席位（`sidebar.right.tab.document.action` 按渲染器 id 分键），
     * 所以只能在**一个**组件里合成工具栏；顺序按使用频率排：先切换版面，再换主题，最后导出。
     */
    function DocumentToolbar(props) {
      const state = useStore();
      const t = props && props.t;
      // 主题或模式变了就重新登记演示页，保证「全屏」链接指向最新一版。
      React.useEffect(() => {
        if (latestDoc.markdown) schedulePresent();
      }, [state.selected, state.mode]);
      React.useEffect(() => {
        if (latestDoc.markdown && !state.presentUrl) schedulePresent();
      }, [state.presentUrl]);
      return h(
        'div',
        { className: 'ct-doc-bar' },
        h(ModeToggle, { t: t, mode: state.mode }),
        h(DocumentThemeSwitch, { state: state, t: t }),
        h(
          'button',
          {
            type: 'button',
            className: state.presentUrl ? 'ct-doc-chip' : 'ct-doc-chip ct-doc-chip-idle',
            title: pick(t, 'presentHint'),
            'data-colamd-chip': 'present',
            'data-colamd-present-link': state.presentUrl ? 'ready' : 'pending',
            onClick: () => presentNow(),
          },
          h(ExpandIcon, { size: 12 }),
          h('span', null, pick(t, 'present'))
        ),
        h(ExportMenu, { t: t }),
        h(Notice, null)
      );
    }

    /* ─────────────────────────── 文档预览渲染器（.md 就地渲染） ─────────────────────────── */

    /** 幻灯片页盒固定 1920×1080，按容器宽度给舞台一个缩放比，标签页里也能整页显示。 */
    function scaleDeck(shadow, host) {
      if (!shadow || !host) return;
      const stage = shadow.querySelector('.ct-stage');
      if (!stage) return;
      // 面板刚挂载时自身宽度可能还是 0，向上退一级再兜底到窗口宽度，
      // 否则缩放比不生效，1920 的纸面会被裁掉。
      const width =
        host.clientWidth ||
        host.getBoundingClientRect().width ||
        (host.parentElement && host.parentElement.clientWidth) ||
        (typeof window !== 'undefined' && window.innerWidth) ||
        960;
      if (!width) return;
      let scale = width / 1920;
      stage.style.setProperty('--deck-scale', String(scale));
      // 舞台（或它的缩放）可能仍比容器宽：量一次实际宽度再收敛，避免右侧被切掉。
      const drawn = stage.getBoundingClientRect().width;
      if (drawn > width + 4) {
        scale = scale * (width / drawn);
        stage.style.setProperty('--deck-scale', String(scale));
      }
      // flow 模式（标签页里看整套幻灯片）按页面自然流动堆叠，高度交给内容；
      // presenting 模式一次只显示一页，撑成一页的高度即可。
      const flow = stage.hasAttribute('data-flow');
      host.style.height = flow ? '' : Math.round(1080 * scale) + 'px';
      fitDeckPages(stage);
    }

    /**
     * 内容比纸面高时按一次定值缩放（transform，不用 zoom：zoom 会改动纸面的
     * 容器查询尺寸，cqw/cqh 跟着重算，字号会越缩越小）。
     */
    function fitDeckPages(stage) {
      const pages = stage.querySelectorAll('.cm-page');
      for (const page of pages) {
        const content = page.querySelector('.cm-content');
        if (!content) continue;
        content.style.fontSize = '';
        const base = parseFloat(getComputedStyle(content).fontSize) || 0;
        if (!base) continue;
        const floor = base * 0.5;
        for (let i = 0; i < 8; i += 1) {
          const room = page.clientHeight;
          const need = content.scrollHeight;
          if (!room || need <= room + 1) break;
          const current = parseFloat(getComputedStyle(content).fontSize) || base;
          const next = current * (room / need) * 0.98;
          if (next < floor) {
            content.style.fontSize = floor.toFixed(2) + "px";
            break;
          }
          content.style.fontSize = next.toFixed(2) + "px";
        }
      }
    }

    let deckObserver = null;

    /** 首帧 + 容器尺寸变化时重新计算舞台缩放（面板宽度变化、分屏都要跟着）。 */
    function scheduleDeckScale(shadow, host) {
      if (!shadow || !host) return;
      const apply = () => scaleDeck(shadow, host);
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(apply);
      else setTimeout(apply, 16);
      if (typeof ResizeObserver === 'function') {
        if (deckObserver) deckObserver.disconnect();
        deckObserver = new ResizeObserver(apply);
        deckObserver.observe(host);
      }
    }

    /** 在 shadow root 里显示一行状态（等待文本 / 渲染失败），避免整页空白。 */
    function paintDocumentStatus(shadow, message) {
      const mount = shadow && shadow.querySelector('.ct-doc-mount');
      if (!mount) return;
      if (!message) {
        if (mount.getAttribute('data-colamd-status') !== null) {
          mount.removeAttribute('data-colamd-status');
          mount.removeAttribute('style');
          mount.textContent = '';
        }
        return;
      }
      if (mount.getAttribute('data-colamd-status') === message) return;
      mount.setAttribute('data-colamd-status', message);
      mount.setAttribute(
        'style',
        'padding:16px 20px;font:13px/1.6 -apple-system,"Segoe UI","Noto Sans SC",sans-serif;color:#8a8f98;white-space:pre-wrap'
      );
      mount.textContent = message;
    }

    /**
     * DSH 文档预览里的 ColaMD 实现：从 owner 拿到已加载的 Markdown 文本，
     * 交给宿主 `/render` 渲染成「主题样式 + `<article class="colamd-document">`」片段，
     * 再塞进 shadow root。
     *
     * 用 shadow DOM 而不是 iframe：主题 CSS 的 `:root` 已被改写成 `:host`，
     * `body` 层改写到宿主，所以样式不外泄，也不需要额外打开一个浏览器窗口。
     */
    function DocumentBody(props) {
      const state = useStore();
      const theme = state.selected || '';
      const mode = state.mode === 'slides' ? 'slides' : 'document';
      const content = props ? props.content : undefined;
      const text = content && content.kind === 'text' ? content.text : '';
      const hostRef = React.useRef(null);
      const shadowRef = React.useRef(null);
      const viewRef = React.useRef({ css: '', html: '', theme: '', mode: '' });

      React.useEffect(() => {
        latestDoc = { markdown: text, title: documentTitle(props) };
        if (text) schedulePresent();
      }, [text, props && props.resourceAddress]);

      // 宿主节点挂上 shadow root，样式和正文都在里面各占一层。
      React.useLayoutEffect(() => {
        const node = hostRef.current;
        if (!node || shadowRef.current) return undefined;
        const shadow = node.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.setAttribute('data-colamd-document-style', '');
        const mount = document.createElement('div');
        mount.className = 'ct-doc-mount';
        shadow.appendChild(style);
        shadow.appendChild(mount);
        shadowRef.current = shadow;
        return undefined;
      }, []);

      React.useEffect(() => {
        const shadow = shadowRef.current;
        if (!text) {
          // 文本还在分页加载中：先给出提示，别让面板看起来是坏的。
          if (!viewRef.current.html && shadow) paintDocumentStatus(shadow, '正在加载文档…');
          return undefined;
        }
        paintDocumentStatus(shadow, '');
        let cancelled = false;
        const timer = setTimeout(() => {
          fetch(resolveApiUrl(API_BASE + '/render'), {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ markdown: text, theme: theme, mode: mode }),
          })
            .then((response) => {
              if (!response.ok) throw new Error('HTTP ' + response.status);
              return response.json();
            })
            .then((data) => {
              const node = shadowRef.current;
              if (cancelled || !node || !data || data.ok !== true) {
                if (!cancelled && node) paintDocumentStatus(node, '渲染服务返回异常：' + ((data && data.error) || 'unknown'));
                return;
              }
              const style = node.querySelector('style[data-colamd-document-style]');
              const mount = node.querySelector('.ct-doc-mount');
              if (
                style &&
                (data.css !== viewRef.current.css || data.theme !== viewRef.current.theme || data.mode !== viewRef.current.mode)
              ) {
                style.textContent = String(data.css || '');
                viewRef.current.css = data.css;
                viewRef.current.theme = data.theme;
                viewRef.current.mode = data.mode;
              }
              if (mount && data.html !== viewRef.current.html) {
                paintDocumentStatus(node, '');
                mount.innerHTML = String(data.html || '');
                viewRef.current.html = data.html;
              }
              // 刚写完 innerHTML 时容器可能还没布局（clientWidth 为 0），
              // 推迟一帧再量，并挂 ResizeObserver 跟随面板宽度变化。
              const host = hostRef.current;
              scheduleDeckScale(node, host);
              latestDoc = { markdown: text, title: documentTitle(props) || data.title || '', mode: state.mode };
            })
            .catch((error) => {
              if (cancelled) return;
              console.warn('[colamd-themes] document render failed:', error);
              // 宿主还没加载到带 /render 的版本时就是这样：给出可操作的提示而不是空白。
              paintDocumentStatus(shadowRef.current, 'ColaMD 渲染失败（' + ((error && error.message) || error) + '），若刚更新插件请重启 DSH');
            });
        }, 140);
        return () => {
          cancelled = true;
          clearTimeout(timer);
        };
      }, [text, theme, mode]);

      return h('div', {
        ref: hostRef,
        className: mode === 'slides' ? 'ct-doc ct-doc-slides' : 'ct-doc',
        'data-colamd-document': theme || true,
        'data-colamd-mode': mode,
        style: { display: 'block', minHeight: '100%' },
      });
    }

    /* ─────────────────────────── 样式 ─────────────────────────── */

    const CSS = `
.ct-root { position: relative; display: inline-flex; align-items: center; }
.ct-root, .ct-root *, .ct-pv, .ct-pv *, .ct-panel, .ct-panel * { box-sizing: border-box; }
.ct-root, .ct-pv, .ct-doc-switch {
  --ct-ink: var(--dsw-alias-label-primary, CanvasText);
  --ct-ink-dim: var(--dsw-alias-label-secondary, color-mix(in srgb, CanvasText 62%, transparent));
  --ct-surface: var(--dsw-alias-bg-overlay, Canvas);
  --ct-layer: var(--dsw-alias-bg-layer-1, color-mix(in srgb, CanvasText 4%, Canvas));
  --ct-layer-2: var(--dsw-alias-bg-layer-2, color-mix(in srgb, CanvasText 9%, Canvas));
  --ct-line: var(--dsw-alias-border-l1, color-mix(in srgb, CanvasText 14%, transparent));
  --ct-line-strong: var(--dsw-alias-border-l2, color-mix(in srgb, CanvasText 28%, transparent));
  --ct-brand: var(--dsw-alias-brand-primary, currentColor);
  --ct-error: var(--dsw-alias-state-error-primary, #d9534f);
}
.ct-chip {
  display: inline-flex; align-items: center; gap: 6px;
  height: 28px; padding: 0 9px 0 8px; border-radius: 999px;
  border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
  background: color-mix(in srgb, currentColor 6%, transparent);
  color: inherit; font: inherit; font-size: 12.5px; line-height: 1;
  cursor: pointer; white-space: nowrap; opacity: .92;
  transition: background .14s ease, border-color .14s ease, opacity .14s ease;
}
.ct-chip:hover { background: color-mix(in srgb, currentColor 11%, transparent); border-color: color-mix(in srgb, currentColor 26%, transparent); opacity: 1; }
.ct-chip-open { background: color-mix(in srgb, currentColor 13%, transparent); border-color: color-mix(in srgb, currentColor 30%, transparent); opacity: 1; }
.ct-chip-label { opacity: .78; }
.ct-chip-name { font-weight: 600; max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
.ct-panel {
  position: fixed; z-index: 2147483000;
  inset: auto auto auto auto; margin: 0;
  display: flex; flex-direction: column; gap: 10px;
  padding: 12px 12px 10px;
  border-radius: 14px;
  border: 1px solid var(--ct-line);
  background: var(--ct-surface);
  color: var(--ct-ink);
  backdrop-filter: blur(14px);
  box-shadow: 0 18px 48px rgba(0,0,0,.34), 0 2px 8px rgba(0,0,0,.18);
  font-size: 12.5px;
}
.ct-panel-head { display: flex; align-items: center; gap: 10px; }
.ct-panel-title { font-weight: 650; font-size: 12.5px; white-space: nowrap; color: var(--ct-ink); }
.ct-search {
  flex: 1; min-width: 90px; height: 26px; padding: 0 9px;
  border-radius: 8px; border: 1px solid var(--ct-line);
  background: var(--ct-layer);
  color: var(--ct-ink); font: inherit; font-size: 12px; outline: none;
}
.ct-search::placeholder { color: var(--ct-ink-dim); }
.ct-search:focus { border-color: var(--ct-line-strong); }
.ct-groups { display: flex; flex-wrap: wrap; gap: 6px; }
.ct-group {
  height: 23px; padding: 0 8px; border-radius: 999px; cursor: pointer;
  border: 1px solid transparent; background: transparent; color: var(--ct-ink-dim);
  font: inherit; font-size: 11.5px;
}
.ct-group:hover { color: var(--ct-ink); background: color-mix(in srgb, var(--ct-ink) 8%, transparent); }
.ct-group-active { color: var(--ct-ink); background: color-mix(in srgb, var(--ct-ink) 13%, transparent); border-color: var(--ct-line); font-weight: 600; }
.ct-grid {
  display: grid; gap: 8px; overflow-y: auto; overscroll-behavior: contain;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  max-height: min(46vh, 300px); padding: 2px;
}
.ct-grid::-webkit-scrollbar { width: 8px; }
.ct-grid::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--ct-ink) 22%, transparent); border-radius: 8px; }
.ct-card {
  position: relative; display: flex; flex-direction: column; gap: 6px;
  padding: 6px; border-radius: 10px; cursor: pointer; text-align: left;
  border: 1px solid var(--ct-line);
  background: var(--ct-layer); color: var(--ct-ink); font: inherit;
  transition: border-color .14s ease, transform .14s ease, background .14s ease;
}
.ct-card:hover { border-color: var(--ct-line-strong); transform: translateY(-1px); }
.ct-card-active { border-color: var(--ct-brand); background: var(--ct-layer-2); }
.ct-card-meta { display: flex; flex-direction: column; gap: 1px; padding: 0 2px 1px; }
.ct-card-name { font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ct-card-sub { font-size: 10.5px; color: var(--ct-ink-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ct-card-badge {
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 0 6px;
  height: 16px;
  line-height: 16px;
  border-radius: 8px;
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--ct-ink-dim);
  background: color-mix(in srgb, var(--ct-ink) 12%, transparent);
}
.ct-card-check { position: absolute; top: 8px; right: 8px; width: 16px; height: 16px; border-radius: 999px; background: var(--ct-brand); color: var(--ct-surface); font-size: 10px; line-height: 16px; text-align: center; }
.ct-thumb { position: relative; border-radius: 7px; border: 1px solid; padding: 8px 9px 9px; height: 74px; overflow: hidden; display: flex; flex-direction: column; gap: 5px; }
.ct-thumb-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
.ct-thumb-title { font-size: 13px; font-weight: 700; line-height: 1; letter-spacing: .01em; }
.ct-thumb-line { height: 3px; border-radius: 2px; }
.ct-thumb-code { margin-top: auto; display: flex; flex-direction: column; gap: 3px; padding: 5px 6px; border-radius: 5px; border: 1px solid; }
.ct-thumb-code span { height: 3px; border-radius: 2px; display: block; }
.ct-thumb-code span:nth-child(1) { width: 46%; }
.ct-thumb-code span:nth-child(2) { width: 72%; }
.ct-thumb-code span:nth-child(3) { width: 34%; }
.ct-panel-foot { display: flex; align-items: center; gap: 10px; padding-top: 8px; border-top: 1px solid var(--ct-line); }
.ct-foot-hint { font-size: 11px; color: var(--ct-ink-dim); flex: 1; }
.ct-foot-action { height: 24px; padding: 0 9px; border-radius: 7px; cursor: pointer; font: inherit; font-size: 11.5px; color: var(--ct-ink); border: 1px solid var(--ct-line); background: var(--ct-layer-2); }
.ct-foot-action:hover { background: color-mix(in srgb, var(--ct-ink) 14%, transparent); }
.ct-empty { padding: 22px 12px; text-align: center; font-size: 12px; color: var(--ct-ink-dim); }
.ct-error { color: var(--ct-error); }
/* 文档标题栏里的主题切换：跟在渲染器下拉之后，尺寸对齐 TitleBar 的 22px 工具按钮。 */
.ct-doc-switch { display: inline-flex; align-items: center; flex: none; margin-right: 2px; }
.ct-doc-bar { display: inline-flex; align-items: center; gap: 4px; flex: none; }
.ct-doc-bar > * { flex: none; }
.ct-doc-chip { display: inline-flex; align-items: center; gap: 5px; height: 22px; max-width: 190px; padding: 0 6px 0 5px; border: 1px solid transparent; border-radius: 6px; cursor: pointer; font: inherit; font-size: 12px; line-height: 1; color: var(--ct-ink-dim); background: transparent; }
.ct-doc-chip:hover { color: var(--ct-ink); background: color-mix(in srgb, var(--ct-ink) 10%, transparent); }
.ct-doc-chip-open { color: var(--ct-ink); background: color-mix(in srgb, var(--ct-ink) 14%, transparent); }
.ct-doc-chip-on { color: var(--ct-brand); background: color-mix(in srgb, var(--ct-brand) 14%, transparent); }
.ct-doc-chip:disabled { cursor: progress; opacity: 0.6; }
.ct-doc-link { text-decoration: none; }
.ct-doc-chip-idle { opacity: 0.6; cursor: progress; }
.ct-doc-chip-name { max-width: 132px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: currentColor; }
/* 导出菜单：贴在胶囊下方，宽度按内容自适应。 */
.ct-export { position: relative; display: inline-flex; flex: none; }
.ct-export-menu { position: absolute; top: calc(100% + 6px); right: 0; z-index: 20; min-width: 208px; padding: 4px; display: flex; flex-direction: column; gap: 1px; background: var(--ct-surface); border: 1px solid var(--ct-line); border-radius: 8px; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28); }
.ct-export-item { text-align: left; padding: 6px 9px; border: 0; border-radius: 5px; cursor: pointer; font: inherit; font-size: 12px; line-height: 1.35; color: var(--ct-ink); background: transparent; white-space: nowrap; }
.ct-export-item:hover { background: color-mix(in srgb, var(--ct-ink) 10%, transparent); }
.ct-pv { display: flex; flex-direction: column; height: 100%; min-height: 260px; color: var(--ct-ink); }
.ct-pv-bar { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-bottom: 1px solid var(--ct-line); font-size: 12px; flex: none; }
.ct-pv-name { font-weight: 600; }
.ct-pv-sub { color: var(--ct-ink-dim); font-size: 11px; }
.ct-notice {
  flex: 0 1 auto !important;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  line-height: 22px;
  color: var(--ct-error);
}
.ct-pv-spacer { flex: 1; }
.ct-pv-btn { width: 22px; height: 22px; border-radius: 6px; cursor: pointer; font: inherit; font-size: 12px; line-height: 1; color: var(--ct-ink); border: 1px solid var(--ct-line); background: transparent; }
.ct-pv-btn:hover { background: color-mix(in srgb, var(--ct-ink) 10%, transparent); }
.ct-pv-btn-on { background: color-mix(in srgb, var(--ct-ink) 16%, transparent); }
.ct-frame { flex: 1; width: 100%; min-height: 0; border: 0; background: var(--ct-surface); }
`;

    /* ─────────────────────────── 安装 ─────────────────────────── */

    let tDict = ZH;

    /** `tDict` 是 `ctx.locale.bind(NS)` 返回的取词函数；也兼容直接传字典对象。 */
    function pick(t, key) {
      const value = typeof t === 'function' ? t(key) : t && t[key];
      return typeof value === 'string' ? value : key;
    }

    function injectStyles() {
      const style = document.createElement('style');
      style.setAttribute('data-colamd-themes', 'ui');
      style.textContent = CSS;
      document.head.appendChild(style);
      return () => {
        if (style.parentNode) style.parentNode.removeChild(style);
      };
    }

    /** 单个席位注册失败不应拖垮整个插件的激活，失败只告警。 */
    function safeEffect(ctx, label, run) {
      ctx.effect(() => {
        try {
          return run();
        } catch (error) {
          console.warn('[colamd-themes] ' + label + ' failed:', error);
          return undefined;
        }
      }, 'colamd-themes: ' + label);
    }

    function apply(ctx) {
      host = ctx;

      ctx.effect(() => {
        return ctx.locale.register(NS, { zh: ZH, en: EN });
      }, 'colamd-themes: dictionaries');

      ctx.effect(() => {
        tDict = ctx.locale.bind(NS);
        return injectStyles();
      }, 'colamd-themes: ui styles');

      safeEffect(ctx, 'composer picker', () =>
        ctx.slots.inject(PICKER_SLOT, () =>
          ctx.slots.register(
            { name: PICKER_SLOT, id: PICKER_ID, order: 12, locale: NS },
            (props) => h(ThemePicker, Object.assign({}, props, { t: ctx.locale.bind(NS) }))
          )
        )
      );

      if (ctx.sidebarRightTabs && ctx.sidebarRightTabs.register) {
        safeEffect(ctx, 'preview tab type', () =>
          ctx.sidebarRightTabs.register({
            id: TAB_ID,
            kind: TAB_KIND,
            title: () => pick(tDict, 'previewTab'),
            keepMounted: true,
            guide: [
              {
                id: 'preview',
                order: 40,
                title: () => pick(tDict, 'guideTitle'),
                description: () => pick(tDict, 'guideDesc'),
              },
            ],
          })
        );

        safeEffect(ctx, 'preview tab body', () =>
          ctx.slots.inject('sidebar.right.pane.tab', () =>
            ctx.slots.register(
              { name: 'sidebar.right.pane.tab', key: TAB_ID, locale: NS },
              () => h(PreviewBody, { t: ctx.locale.bind(NS) })
            )
          )
        );
      } else {
        console.warn('[colamd-themes] sidebarRightTabs unavailable — sidebar preview disabled');
      }

      // 文档预览渲染器：DSH 打开 .md 时可直接选「ColaMD 主题」这一实现。
      if (ctx.documentPreviews && ctx.documentPreviews.register) {
        safeEffect(ctx, 'document renderer type', () =>
          ctx.documentPreviews.register({
            id: DOC_ID,
            extensions: DOC_EXTENSIONS,
            priority: 'extension',
            title: () => pick(tDict, 'docRenderer'),
            loading: 'text-pages',
            wrap: false,
          })
        );

        safeEffect(ctx, 'document renderer body', () =>
          ctx.slots.inject('sidebar.right.tab.document', () =>
            ctx.slots.register(
              { name: 'sidebar.right.tab.document', key: DOC_ID, locale: NS },
              (props) => h(DocumentBody, Object.assign({}, props, { t: ctx.locale.bind(NS) }))
            )
          )
        );

        safeEffect(ctx, 'document renderer actions', () =>
          ctx.slots.inject('sidebar.right.tab.document.action', () =>
            ctx.slots.register(
              { name: 'sidebar.right.tab.document.action', key: DOC_ID, locale: NS },
              (props) => h(DocumentToolbar, Object.assign({}, props, { t: ctx.locale.bind(NS) }))
            )
          )
        );
      } else {
        console.warn('[colamd-themes] documentPreviews unavailable — Markdown keeps the builtin renderer');
      }

      return () => {
        host = null;
        store.patch({ open: false });
      };
    }

    return { name: NS, inject: INJECT, apply: apply };
  },
});
