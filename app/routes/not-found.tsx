import { data } from 'react-router';

export function loader() {
  throw data('Halaman tidak ditemukan', { status: 404 });
}

export default function NotFound() {
  return null;
}
