import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_BIO_LENGTH = 200;

export default function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
  const { displayName, profile, updateProfile } = useAuth();
  const [name, setName] = useState(displayName);
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);

  // Sync the form with the latest auth values every time the dialog opens
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setName(displayName);
      setBio(profile?.bio || '');
    }
    onOpenChange(next);
  };

  const handleSave = async () => {
    if (saving) return;
    const trimmedName = name.trim() || displayName;
    const trimmedBio = bio.trim();

    setSaving(true);
    try {
      await updateProfile({
        username: trimmedName,
        bio: trimmedBio === '' ? null : trimmedBio,
      });
      toast.success('Profile updated');
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(`Failed to update profile: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Profile</DialogTitle>
          <DialogDescription className="text-gray-400">
            Update your display name and bio. Your email stays private and is
            only used to generate your profile picture.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="profile-name" className="text-sm font-medium text-gray-300">
              Display Name
            </label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              className="bg-slate-800 border-white/10 text-white"
              maxLength={40}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="profile-bio" className="text-sm font-medium text-gray-300">
              Bio
            </label>
            <Textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short introduction about yourself"
              className="bg-slate-800 border-white/10 text-white resize-none"
              rows={3}
              maxLength={MAX_BIO_LENGTH}
            />
            <p className="text-xs text-gray-500 text-right">
              {bio.length}/{MAX_BIO_LENGTH}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="border-white/10 text-gray-300 hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
