'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onLimitReached?: () => void;
}

export default function CreateProjectModal({ open, onClose, onLimitReached }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleCreate = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });

      if (res.status === 403) {
        const data = await res.json();
        if (data.upgradeRequired) {
          onClose();
          onLimitReached?.();
          return;
        }
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create project');
        return;
      }

      const project = await res.json();
      router.push(`/editor/${project.id}`);
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleCreate();
    }
  };

  if (!open) return null;

  return (
    <Modal>
      <div className="w-[380px] max-w-[90vw]">
        <h2 className="font-heading text-lg text-ink mb-4">New Project</h2>
        <Input
          label="Project name"
          placeholder="Untitled Project"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={loading}
        />
        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
        <div className="flex gap-2 mt-5 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
