"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageDropzone } from "@/components/library/ImageDropzone";
import { ImageGrid } from "@/components/library/ImageGrid";
import { ImageSearch } from "@/components/library/ImageSearch";
import { StorageBar } from "@/components/library/StorageBar";
import { Button } from "@/components/ui/Button";
import type { ImageData } from "@/types";

interface ApiResponse {
  images: ImageData[];
  total: number;
  page: number;
  totalPages: number;
}

interface UserData {
  storageUsed: number;
  plan: string;
}

export default function LibraryPage() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      if (search) params.set("search", search);

      const res = await fetch(`/api/images?${params}`);
      if (res.ok) {
        const data: ApiResponse = await res.json();
        setImages(data.images);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Failed to fetch images:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch("/api/user");
      if (res.ok) {
        const data: UserData = await res.json();
        setUserData(data);
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleSearch = useCallback((query: string) => {
    setSearch(query);
    setPage(1);
  }, []);

  const handleUploadComplete = useCallback(() => {
    fetchImages();
    fetchUserData();
  }, [fetchImages, fetchUserData]);

  const handleDelete = useCallback(() => {
    fetchImages();
    fetchUserData();
  }, [fetchImages, fetchUserData]);

  return (
    <main className="min-h-screen p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-heading text-3xl text-ink">Image Library</h1>
        {userData && (
          <StorageBar used={userData.storageUsed} plan={userData.plan} />
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <ImageSearch onSearch={handleSearch} resultCount={total} />
      </div>

      {/* Dropzone */}
      <div className="mb-6">
        <ImageDropzone onUploadComplete={handleUploadComplete} />
      </div>

      {/* Image Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-dim text-sm mt-2">Loading images...</p>
        </div>
      ) : (
        <ImageGrid images={images} onDelete={handleDelete} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-dim">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </main>
  );
}
