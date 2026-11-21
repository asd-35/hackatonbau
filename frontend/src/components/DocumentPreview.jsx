import React from "react";
import { TEMPLATE_TEXT } from "../data/mockData";
import {
  reportFooterLeft,
  reportHeading,
  reportMetaLine,
  visibleSections,
} from "../utils/documentUtils";

export default function DocumentPreview({ doc, photos, includeInternal }) {
  const text = TEMPLATE_TEXT[doc.language] || TEMPLATE_TEXT.en;
  const rows = visibleSections(doc, includeInternal);
  const summary = doc.fields?.summary || "";

  return (
    <div className="btb-scroll">
      <div className="btb-page">
        <p className="btb-title">{doc.fields?.title || text.report_title}</p>
        <div className="btb-meta">{reportMetaLine(doc)}</div>
        <p className="btb-heading">{reportHeading(doc)}</p>
        {summary && <p className="btb-summary">{summary}</p>}

        <table className="btb-table">
          <thead>
            <tr>
              <th style={{ width: "25%" }}>{text.col_left}</th>
              <th>{text.col_right}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, body], idx) => (
              <tr key={`${label}-${idx}`}>
                <td className="btb-label">{label}</td>
                <td>
                  {body.split("\n").map((line, lineIdx) => (
                    <React.Fragment key={lineIdx}>
                      {lineIdx > 0 && <br />}
                      {line}
                    </React.Fragment>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {photos.length > 0 && (
          <>
            <div className="btb-appendix">{text.photos}</div>
            <div className="btb-photos">
              {photos.map((photo, idx) => (
                <figure key={`${photo.photoId}-${idx}`}>
                  {photo.dataUrl ? (
                    <img src={photo.dataUrl} alt={photo.photoId} />
                  ) : (
                    <div className="btb-placeholder">{photo.photoId}</div>
                  )}
                  <figcaption>
                    <b>{photo.photoId}</b>
                    <br />
                    {photo.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}

        <div className="btb-footer">
          <span>{reportFooterLeft(doc)}</span>
          <span>{text.preview}</span>
        </div>
      </div>
    </div>
  );
}
