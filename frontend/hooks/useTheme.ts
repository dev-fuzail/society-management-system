import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, AppTheme } from '@/constants/theme';

export function useTheme(): AppTheme {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme];
}
