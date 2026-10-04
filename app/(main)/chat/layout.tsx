import { ChatViewportLock } from "@/components/chat/ChatViewportLock"
import "@/components/chat/chat.css"

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatViewportLock>
      <div className="fixed inset-x-0 top-16 bottom-[var(--app-tabbar-offset)] z-20 overflow-hidden bg-background lg:bottom-0">
        {children}
      </div>
    </ChatViewportLock>
  )
}
