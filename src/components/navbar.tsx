import { Camera, CirclePlay, Settings, Search, Languages } from 'lucide-react'
import { Button } from './ui/button'

export function Navbar() {
  return (
    <nav className="bg-white shadow-sm w-full">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex">
            <span className="ml-2 text-xl font-semibold">SyncPhoto</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Languages className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
