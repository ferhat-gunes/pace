import {Theme} from '@astryxdesign/core';
import {matchaTheme} from '@astryxdesign/theme-matcha/built';
import '../../assets/astryx-matcha.css';
import '../styles/brand.css';
export default function ThemeProvider({children}) {
  return <Theme theme={matchaTheme} mode="light">{children}</Theme>;
}
