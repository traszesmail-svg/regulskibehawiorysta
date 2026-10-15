export function SkipToContent() {
  return <a className="skip-to-content" href="#main-content">Przejdź do treści</a>
}

// The page's existing main landmark also contains its navigation. Keep this
// target after that navigation so activating the link really bypasses it.
export function MainContentStart() {
  return <span id="main-content" className="main-content-start" tabIndex={-1}>Treść strony</span>
}
