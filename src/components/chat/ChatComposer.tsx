import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Send, X, Sparkles, UploadCloud } from 'lucide-react';

interface ChatComposerProps {
  onSendMessage: (text: string, imageBase64?: string, mimeType?: string, filename?: string) => void;
  isLoading: boolean;
  onSelectPrompt?: (prompt: string) => void;
}

const QUICK_PROMPTS = [
  'Generate today\'s rollover slip',
  'Generate a 4-5 odds slip',
  'Analyze this X post',
  'Analyze this ticket',
  'Trim to 5 selections',
  'Research Arsenal vs Chelsea',
  'Calculate for ₦5,000 stake',
];

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  isLoading,
  onSelectPrompt,
}) => {
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{
    base64: string;
    mimeType: string;
    filename: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Support paste image directly from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedImage({
        base64: result,
        mimeType: file.type,
        filename: file.name || 'ticket_screenshot.png',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!text.trim() && !selectedImage) || isLoading) return;

    onSendMessage(
      text.trim(),
      selectedImage?.base64,
      selectedImage?.mimeType,
      selectedImage?.filename
    );

    setText('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-3 bg-[#121A2B] border-t border-[#1E2D4A] space-y-2">
      {/* Quick Prompts Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-slate-500 flex items-center gap-1 text-[11px] font-semibold shrink-0 pl-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> Prompts:
        </span>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSendMessage(prompt)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full bg-[#18233A] hover:bg-[#1E2D4A] text-slate-300 hover:text-white text-[11px] font-medium border border-[#1E2D4A] whitespace-nowrap transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Upload Preview if Image Attached */}
      {selectedImage && (
        <div className="relative inline-flex items-center gap-2 p-2 rounded-lg bg-[#0B1020] border border-blue-500/40">
          <img
            src={selectedImage.base64}
            alt="Preview"
            className="w-12 h-12 object-cover rounded"
          />
          <div className="text-xs">
            <span className="font-semibold text-white block truncate max-w-xs font-mono">
              {selectedImage.filename}
            </span>
            <span className="text-[10px] text-blue-400">Ready for Multimodal Extraction</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="p-1 text-slate-400 hover:text-rose-400 rounded-full hover:bg-slate-800 cursor-pointer ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drag & drop overlay indicator */}
      {isDragging && (
        <div className="p-4 rounded-xl bg-blue-950/40 border-2 border-dashed border-blue-500 flex items-center justify-center gap-2 text-xs text-blue-300">
          <UploadCloud className="w-5 h-5 text-blue-400 animate-bounce" />
          <span>Drop your ticket screenshot here to extract</span>
        </div>
      )}

      {/* Main Form Input */}
      <form
        onSubmit={handleSubmit}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className="flex items-end gap-2 bg-[#0B1020] p-2 rounded-xl border border-[#1E2D4A] focus-within:border-blue-500/60 transition-colors"
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Upload Screenshot button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-[#18233A] rounded-lg transition-colors cursor-pointer shrink-0"
          title="Upload or paste betting ticket screenshot (SportyBet, Bet9ja, 1xBet, BetKing)"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask BetPilot AI... (e.g., 'Trim ticket to 5 games', 'Check booking code BC982', paste screenshot)"
          className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 resize-none outline-none py-1.5 px-1 max-h-32"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={(!text.trim() && !selectedImage) || isLoading}
          className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
        <span>Paste (Ctrl+V) screenshot or drop image anytime</span>
        <span>Enter to send • Shift+Enter for new line</span>
      </div>
    </div>
  );
};
