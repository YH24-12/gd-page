import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Calendar, Users, ListTodo, Sparkles, Settings, Upload } from 'lucide-react'

interface LayoutProps { children: ReactNode }

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navItems = [
    { path: '/', icon: Calendar, label: '仪表盘' },
    { path: '/customers', icon: Users, label: '客户管理' },
    { path: '/import', icon: Upload, label: '导入客户' },
    { path: '/schedules', icon: ListTodo, label: '日程管理' },
    { path: '/ai-generate', icon: Sparkles, label: 'AI生成' },
    { path: '/settings', icon: Settings, label: '设置' }
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 240, background: 'var(--surface)', borderRight: '1px solid var(--border)', position: 'fixed', height: '100vh' }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>团队行程</h1>
        </div>
        <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                color: location.pathname === item.path ? 'white' : 'var(--text-secondary)',
                background: location.pathname === item.path ? 'var(--primary)' : 'transparent',
                textDecoration: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500
              }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, marginLeft: 240, background: 'var(--background)', minHeight: '100vh' }}>
        <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>{children}</div>
      </main>
    </div>
  )
}
