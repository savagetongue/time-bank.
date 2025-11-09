export function Footer() {
  return (
    <footer className="border-t">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ChronoBank. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Built with ���️ at Cloudflare</p>
        </div>
      </div>
    </footer>
  );
}