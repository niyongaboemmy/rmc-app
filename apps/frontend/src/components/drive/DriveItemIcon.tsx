'use client';

import {
  Folder, FileText, Film, Music, Image as ImageIcon,
  File, Archive, FileSpreadsheet, Presentation,
} from 'lucide-react';
import { DriveItem, getFileIcon } from '@/lib/driveApi';

const FOLDER_COLORS: Record<string, string> = {
  '#4285F4': '#4285F4',
  '#EA4335': '#EA4335',
  '#FBBC04': '#FBBC04',
  '#34A853': '#34A853',
  '#FF6D00': '#FF6D00',
  '#9C27B0': '#9C27B0',
};

interface DriveItemIconProps {
  item: DriveItem;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZES = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export function DriveItemIcon({ item, size = 'md' }: DriveItemIconProps) {
  const cls = SIZES[size];
  const fileType = getFileIcon(item);

  if (item.type === 'folder') {
    const color = item.color && FOLDER_COLORS[item.color] ? item.color : '#4285F4';
    return <Folder className={cls} style={{ color }} fill={color} fillOpacity={0.85} />;
  }

  const iconMap: Record<string, React.ReactNode> = {
    image: <ImageIcon className={`${cls} text-blue-500`} />,
    video: <Film className={`${cls} text-purple-500`} />,
    audio: <Music className={`${cls} text-green-500`} />,
    pdf: <FileText className={`${cls} text-red-500`} />,
    doc: <FileText className={`${cls} text-blue-600`} />,
    sheet: <FileSpreadsheet className={`${cls} text-green-600`} />,
    slides: <Presentation className={`${cls} text-yellow-600`} />,
    zip: <Archive className={`${cls} text-orange-500`} />,
    text: <FileText className={`${cls} text-gray-500`} />,
    file: <File className={`${cls} text-gray-400`} />,
  };

  return <>{iconMap[fileType] ?? <File className={`${cls} text-gray-400`} />}</>;
}

export function MimeTypeIcon({ mimeType, size = 'md' }: { mimeType: string | null; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const fakeItem = { type: 'file', mimeType } as DriveItem;
  return <DriveItemIcon item={fakeItem} size={size} />;
}
