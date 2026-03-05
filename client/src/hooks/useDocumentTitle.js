import { useEffect } from 'react';

export default function useDocumentTitle(title) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${title} | AUTH/SYS`;
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
}
