"use client";

import { useState } from "react";
import { cn, formatBytes } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { ImageData } from "@/types";

interface ImageGridProps {
  images: ImageData[];
  onDelete: (id: string) => void;
}

export function ImageGrid({ images, onDelete }: ImageGridProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/images/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        onDelete(deleteId);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-16">
        <svg
          className="w-16 h-16 mx-auto text-dim/50 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-dim text-sm">No images yet. Upload your first image.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="group relative rounded-lg border border-line bg-panel overflow-hidden"
          >
            {/* Thumbnail */}
            <div className="aspect-square relative overflow-hidden bg-panel2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.thumbnailUrl || image.url}
                alt={image.originalName}
                className="w-full h-full object-cover"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <a
                  href={image.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded bg-panel border border-line text-ink hover:bg-panel2"
                  title="Download"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
                <button
                  onClick={() => setDeleteId(image.id)}
                  className="p-2 rounded bg-panel border border-line text-warn hover:bg-panel2"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Info */}
            <div className="p-3">
              <p className="text-sm text-ink truncate" title={image.originalName}>
                {image.originalName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-dim">
                  {image.width}×{image.height}
                </span>
                <span className="text-xs text-dim">•</span>
                <span className="text-xs text-dim">{formatBytes(image.sizeBytes)}</span>
              </div>
              <p className="text-xs text-dim mt-1">
                {new Date(image.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation modal */}
      {deleteId && (
        <Modal>
          <div className="max-w-sm">
            <h3 className="text-lg font-heading text-ink mb-2">Delete Image</h3>
            <p className="text-sm text-dim mb-4">
              Are you sure you want to delete this image? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className={cn(deleting && "opacity-50")}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
