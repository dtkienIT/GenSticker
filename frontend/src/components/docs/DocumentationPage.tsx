import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Maximize2,
  Layers,
  Search,
  X,
} from 'lucide-react';
import './DocumentationPage.css';

interface DocumentationMeta {
  project: string;
  title: string;
  version: string;
  branch: string;
  commit: string;
  verifiedAt: string;
  sourcePolicy: string;
  verification: string[];
  verificationStats?: {
    backendTests: number;
    backendWarnings: number;
    frontendLint: string;
    frontendBuild: string;
    paidApiCalls: number;
  };
  figmaSource?: {
    page: string;
    url: string;
    note: string;
  };
}

interface DocumentationSection {
  title: string;
  type: 'paragraphs' | 'bullets' | 'table' | 'sources';
  paragraphs?: string[];
  bullets?: string[];
  headers?: string[];
  rows?: string[][];
  sources?: string[];
}

interface DocumentationSheet {
  name: string;
  summary: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}

interface DocumentationFigure {
  id: string;
  title: string;
  subtitle: string;
  caption: string;
  alt: string;
  svg: string;
  png: string;
  sourceRefs: string[];
}

interface DocumentationVisual {
  figureId: string;
  afterSection?: string;
  sheetName?: string;
}

interface DocumentationItem {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  kind: 'DOCX' | 'XLSX';
  category: string;
  filename: string;
  summary: string;
  status: string;
  assetPath: string;
  searchTerms?: string[];
  visuals?: DocumentationVisual[];
  sections?: DocumentationSection[];
  sheets?: DocumentationSheet[];
}

interface DocumentationManifest {
  meta: DocumentationMeta;
  figures: Record<string, DocumentationFigure>;
  documents: DocumentationItem[];
}

interface DocumentationPageProps {
  onBack: () => void;
}

const baseUrl = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
const docsBaseUrl = `${baseUrl}gen-sticker-docs`;

function DocumentIcon({ kind }: { kind: DocumentationItem['kind'] }) {
  return kind === 'DOCX' ? <FileText size={18} /> : <FileSpreadsheet size={18} />;
}

function DocumentTable({ headers = [], rows = [], caption = 'Bảng dữ liệu tài liệu' }: {
  headers?: string[];
  rows?: Array<Array<string | number>>;
  caption?: string;
}) {
  return (
    <div className="docs-table-wrap" tabIndex={0} aria-label={`${caption}. Cuộn ngang để xem đầy đủ nếu cần.`}>
      <table className="docs-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {headers.map((header) => <th key={header} scope="col">{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${row.join('|')}`}>
              {row.map((cell, cellIndex) => <td key={`${cellIndex}-${String(cell)}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FigureGallery({ figures, onExpand }: {
  figures: DocumentationFigure[];
  onExpand: (figure: DocumentationFigure) => void;
}) {
  if (figures.length === 0) return null;

  return (
    <section className="docs-visual-gallery" aria-label="Sơ đồ và hình minh họa của tài liệu">
      <div className="docs-section-heading">
        <span className="docs-section-kicker">VISUAL-FIRST · SOURCE-DERIVED</span>
        <h3>{figures.length} sơ đồ chính</h3>
        <p>Nhấn vào sơ đồ để xem toàn màn hình. Mỗi hình đều có caption, mô tả và đường dẫn source dùng để kiểm chứng.</p>
      </div>
      <div className="docs-figure-grid">
        {figures.map((figure, index) => (
          <figure className="docs-figure" key={figure.id}>
            <button
              className="docs-figure-preview"
              type="button"
              onClick={() => onExpand(figure)}
              aria-label={`Phóng to sơ đồ ${figure.title}`}
            >
              <img src={`${docsBaseUrl}/${figure.svg}`} alt={figure.alt} loading={index === 0 ? 'eager' : 'lazy'} />
              <span><Maximize2 size={16} /> Phóng to</span>
            </button>
            <figcaption>
              <strong>{figure.title}</strong>
              <p>{figure.caption}</p>
              <details>
                <summary>Nguồn kiểm chứng</summary>
                <ul>{figure.sourceRefs.map((source) => <li key={source}><code>{source}</code></li>)}</ul>
              </details>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function DocxViewer({ sections = [] }: { sections?: DocumentationSection[] }) {
  return (
    <div className="docs-document-body">
      {sections.map((section) => (
        <section className="docs-content-section" key={section.title}>
          <h3>{section.title}</h3>
          {section.type === 'paragraphs' && section.paragraphs?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.type === 'bullets' && (
            <ul>
              {section.bullets?.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          )}
          {section.type === 'table' && (
            <DocumentTable headers={section.headers} rows={section.rows} caption={section.title} />
          )}
          {section.type === 'sources' && (
            <ul className="docs-source-list">
              {section.sources?.map((source) => <li key={source}><code>{source}</code></li>)}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function XlsxViewer({ sheets = [], activeSheet, onSelectSheet }: {
  sheets?: DocumentationSheet[];
  activeSheet: number;
  onSelectSheet: (index: number) => void;
}) {
  const sheet = sheets[activeSheet];
  if (!sheet) return null;

  return (
    <div className="docs-workbook-body">
      <div className="docs-sheet-tabs" role="tablist" aria-label="Các sheet trong workbook">
        {sheets.map((item, index) => (
          <button
            className={index === activeSheet ? 'is-active' : ''}
            key={item.name}
            onClick={() => onSelectSheet(index)}
            role="tab"
            aria-selected={index === activeSheet}
            type="button"
          >
            {item.name}
          </button>
        ))}
      </div>
      <section className="docs-content-section docs-sheet-content" role="tabpanel">
        <span className="docs-section-kicker">Sheet {activeSheet + 1} / {sheets.length}</span>
        <h3>{sheet.name}</h3>
        <p>{sheet.summary}</p>
        <DocumentTable headers={sheet.headers} rows={sheet.rows} caption={`${sheet.name} — ${sheet.summary}`} />
      </section>
    </div>
  );
}

export function DocumentationPage({ onBack }: DocumentationPageProps) {
  const [manifest, setManifest] = useState<DocumentationManifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [expandedFigure, setExpandedFigure] = useState<DocumentationFigure | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setLoadError(null);

    fetch(`${docsBaseUrl}/project-docs.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<DocumentationManifest>;
      })
      .then((payload) => {
        setManifest(payload);
        setSelectedId((current) => current ?? payload.documents[0]?.id ?? null);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLoadError('Không tải được bộ tài liệu. Vui lòng kiểm tra lại bản build hoặc thử lại.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const categories = useMemo(() => {
    if (!manifest) return [];
    return ['Tất cả', ...Array.from(new Set(manifest.documents.map((item) => item.category)))];
  }, [manifest]);

  const filteredDocuments = useMemo(() => {
    if (!manifest) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    return manifest.documents.filter((item) => {
      const matchesCategory = category === 'Tất cả' || item.category === category;
      const matchesQuery = normalizedQuery.length === 0
        || JSON.stringify(item).toLocaleLowerCase('vi').includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, manifest, query]);

  const selectedDocument = useMemo(() => {
    if (!manifest) return null;
    return manifest.documents.find((item) => item.id === selectedId) ?? manifest.documents[0] ?? null;
  }, [manifest, selectedId]);

  useEffect(() => {
    setActiveSheet(0);
    setExpandedFigure(null);
  }, [selectedId]);

  useEffect(() => {
    if (!expandedFigure) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpandedFigure(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedFigure]);

  if (isLoading) {
    return (
      <div className="docs-loading glass-panel" role="status">
        <BookOpen size={34} />
        <h2>Đang mở thư viện tài liệu…</h2>
        <p>Đang nạp bản nội dung đã đối chiếu source.</p>
      </div>
    );
  }

  if (loadError || !manifest || !selectedDocument) {
    return (
      <div className="docs-loading glass-panel" role="alert">
        <AlertTriangle size={34} />
        <h2>Chưa mở được tài liệu</h2>
        <p>{loadError ?? 'Manifest tài liệu không hợp lệ.'}</p>
        <div className="docs-error-actions">
          <button className="btn-secondary" type="button" onClick={onBack}><ArrowLeft size={17} /> Quay lại</button>
          <button className="btn-primary" type="button" onClick={() => setReloadKey((key) => key + 1)}>Thử tải lại</button>
        </div>
      </div>
    );
  }

  const docxCount = manifest.documents.filter((item) => item.kind === 'DOCX').length;
  const xlsxCount = manifest.documents.length - docxCount;
  const downloadUrl = `${docsBaseUrl}/${selectedDocument.assetPath}`;
  const selectedFigures = (selectedDocument.visuals ?? [])
    .map((visual) => manifest.figures[visual.figureId])
    .filter((figure): figure is DocumentationFigure => Boolean(figure));

  return (
    <div className="docs-page">
      <section className="docs-hero glass-panel">
        <div className="docs-hero-copy">
          <button className="docs-back-button" type="button" onClick={onBack}>
            <ArrowLeft size={17} />
            Quay lại trình tạo
          </button>
          <span className="docs-eyebrow"><BookOpen size={16} /> AS-BUILT DOCUMENTATION</span>
          <h1>Tài liệu <span className="text-gradient">GenSticker</span></h1>
          <p>{manifest.meta.sourcePolicy}</p>
          <div className="docs-baseline">
            <CheckCircle2 size={17} />
            <span>Đã đối chiếu</span>
            <code>{manifest.meta.branch} @ {manifest.meta.commit}</code>
            <span>{manifest.meta.verifiedAt}</span>
          </div>
          {manifest.meta.figmaSource && (
            <a className="docs-figma-link" href={manifest.meta.figmaSource.url} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              Mở board Figma tham chiếu (không tự đồng bộ)
            </a>
          )}
        </div>
        <div className="docs-hero-stats" aria-label="Thống kê bộ tài liệu">
          <div><strong>{manifest.documents.length}</strong><span>tài liệu</span></div>
          <div><strong>{docxCount}</strong><span>Word</span></div>
          <div><strong>{xlsxCount}</strong><span>Excel</span></div>
          <div><strong>{manifest.meta.verificationStats?.backendTests ?? '—'}</strong><span>backend tests</span></div>
        </div>
      </section>

      <div className="docs-workspace">
        <aside className="docs-sidebar glass-panel" aria-label="Danh sách tài liệu">
          <div className="docs-sidebar-heading">
            <div>
              <span className="docs-section-kicker">Thư viện</span>
              <h2>Chọn tài liệu</h2>
            </div>
            <span className="docs-result-count">{filteredDocuments.length}/{manifest.documents.length}</span>
          </div>

          <label className="docs-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Tìm tài liệu</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm API, bảo mật, chất lượng…"
            />
          </label>

          <div className="docs-category-list" aria-label="Lọc theo nhóm">
            {categories.map((item) => (
              <button
                className={category === item ? 'is-active' : ''}
                key={item}
                onClick={() => setCategory(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="docs-file-list">
            {filteredDocuments.length === 0 && (
              <div className="docs-empty-state">
                <Search size={24} />
                <p>Không có tài liệu phù hợp.</p>
              </div>
            )}
            {filteredDocuments.map((item) => (
              <button
                className={`docs-file-card ${selectedDocument.id === item.id ? 'is-active' : ''}`}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                type="button"
                aria-current={selectedDocument.id === item.id ? 'page' : undefined}
              >
                <span className="docs-file-icon"><DocumentIcon kind={item.kind} /></span>
                <span className="docs-file-copy">
                  <span className="docs-file-meta">{item.number} · {item.kind} · {item.category}</span>
                  <strong>{item.title}</strong>
                  <small>{item.summary}</small>
                </span>
                <ChevronRight className="docs-file-chevron" size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
        </aside>

        <article className="docs-viewer glass-panel">
          <header className="docs-viewer-header">
            <div className="docs-viewer-title-row">
              <span className="docs-viewer-icon"><DocumentIcon kind={selectedDocument.kind} /></span>
              <div>
                <span className="docs-file-meta">GS-DOC-{selectedDocument.number} · {selectedDocument.status}</span>
                <h2>{selectedDocument.title}</h2>
                <p>{selectedDocument.subtitle}</p>
              </div>
            </div>
            <a className="btn-primary docs-download-button" href={downloadUrl} download={selectedDocument.filename}>
              <Download size={17} />
              Tải file {selectedDocument.kind}
            </a>
          </header>

          <div className="docs-viewer-summary">
            <Layers size={18} />
            <p>{selectedDocument.summary}</p>
          </div>

          <FigureGallery figures={selectedFigures} onExpand={setExpandedFigure} />

          {selectedDocument.kind === 'DOCX' ? (
            <DocxViewer sections={selectedDocument.sections} />
          ) : (
            <XlsxViewer
              sheets={selectedDocument.sheets}
              activeSheet={activeSheet}
              onSelectSheet={setActiveSheet}
            />
          )}

          <footer className="docs-viewer-footer">
            <CheckCircle2 size={17} />
            <span>Bản web và file Office dùng chung một manifest nguồn.</span>
          </footer>
        </article>
      </div>
      {expandedFigure && (
        <div className="docs-lightbox" role="dialog" aria-modal="true" aria-label={`Sơ đồ ${expandedFigure.title}`} onMouseDown={() => setExpandedFigure(null)}>
          <div className="docs-lightbox-panel" onMouseDown={(event) => event.stopPropagation()}>
            <button className="docs-lightbox-close" type="button" onClick={() => setExpandedFigure(null)} aria-label="Đóng sơ đồ">
              <X size={22} />
            </button>
            <div className="docs-lightbox-copy">
              <span className="docs-section-kicker">SOURCE-DERIVED VECTOR</span>
              <h2>{expandedFigure.title}</h2>
              <p>{expandedFigure.caption}</p>
            </div>
            <div className="docs-lightbox-image-wrap">
              <img src={`${docsBaseUrl}/${expandedFigure.svg}`} alt={expandedFigure.alt} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
