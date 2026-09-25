import type { ExportReport } from '../../io/fbx/export';

interface Props {
  report: ExportReport;
  onConfirm: () => void;
  onCancel: () => void;
}

/** E-05: summary shown before an FBX export actually writes a file, so mistakes (missing materials, degenerate faces, an unexpectedly huge triangle count) are caught before Unity import instead of after. */
export function ExportReportDialog({ report, onConfirm, onCancel }: Props) {
  return (
    <div className="export-report-overlay" onClick={onCancel}>
      <div className="export-report-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Riepilogo esportazione FBX</h2>
        <dl className="export-report-dialog__stats">
          <dt>Mesh</dt>
          <dd>{report.meshCount}</dd>
          <dt>Triangoli</dt>
          <dd>{report.triangleCount}</dd>
          <dt>Materiali</dt>
          <dd>{report.materialCount}</dd>
        </dl>
        {report.warnings.length > 0 && (
          <ul className="export-report-dialog__warnings">
            {report.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
        <div className="export-report-dialog__actions">
          <button type="button" onClick={onCancel}>
            Annulla
          </button>
          <button type="button" className="export-report-dialog__confirm" onClick={onConfirm}>
            Esporta
          </button>
        </div>
      </div>
    </div>
  );
}
