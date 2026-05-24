// Calendar 2.0 iOS Scriptable Widget
// 支持小/中/大三种尺寸
// 配置: 在 Scriptable 应用中添加 Widget，设置参数为 "CALENDAR"

const SMALL_SIZE = 0
const MEDIUM_SIZE = 1
const LARGE_SIZE = 2

// 获取参数
const size = (args.widgetParameter || "").split(",")[0] || "medium"
let widgetSize = MEDIUM_SIZE
if (size === "small") widgetSize = SMALL_SIZE
else if (size === "large") widgetSize = LARGE_SIZE

// 配置
const CONFIG = {
  appUrl: "calendar2://",
  accentColor: "#2563eb",
  maxItems: widgetSize === SMALL_SIZE ? 1 : widgetSize === MEDIUM_SIZE ? 3 : 5
}

// 创建小组件
const widget = new ListWidget()
widget.backgroundColor = new Color("#ffffff")
widget.useDefaultBackground()

// 加载数据 (从本地存储读取)
async function loadSchedules() {
  try {
    const fm = FileManager.iCloud()
    const path = fm.joinPath(fm.documentsDirectory(), "calendar_data.json")
    if (fm.fileExists(path)) {
      const data = fm.readString(path)
      return JSON.parse(data)
    }
  } catch (e) {
    // 读取失败
  }
  return { schedules: [], lastUpdated: null }
}

// 获取今日行程
function getTodaySchedules(data) {
  const today = new Date().toISOString().split("T")[0]
  return (data.schedules || []).filter(s => s.date === today)
}

// 格式化时间
function formatTime(time) {
  if (!time) return ""
  return time.substring(0, 5)
}

// 渲染小组件
async function renderWidget() {
  const data = await loadSchedules()
  const todaySchedules = getTodaySchedules(data)

  // 标题行
  const header = widget.addStack()
  header.layoutHorizontally()
  header.centerAlignContent()

  const title = header.addText("Calendar 2.0")
  title.font = Font.boldSystemFont(12)
  title.textColor = new Color("#1e293b")

  header.addSpacer()

  const dateText = header.addText(new Date().toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }))
  dateText.font = Font.systemFont(10)
  dateText.textColor = new Color("#64748b")

  widget.addSpacer(8)

  if (todaySchedules.length === 0) {
    // 空状态
    const emptyStack = widget.addStack()
    emptyStack.layoutHorizontally()
    emptyStack.centerAlignContent()

    const emptyText = emptyStack.addText("今日暂无行程安排")
    emptyText.font = Font.systemFont(11)
    emptyText.textColor = new Color("#94a3b8")
  } else {
    // 显示行程
    const itemsToShow = todaySchedules.slice(0, CONFIG.maxItems)

    for (const schedule of itemsToShow) {
      const row = widget.addStack()
      row.layoutHorizontally()
      row.centerAlignContent()
      row.paddingTop = 4
      row.paddingBottom = 4

      // 时间
      const timeLabel = row.addText(schedule.startTime ? formatTime(schedule.startTime) : "全天")
      timeLabel.font = Font.systemFont(10)
      timeLabel.textColor = new Color("#2563eb")
      timeLabel.width = 45

      // 标题
      const titleLabel = row.addText(schedule.title)
      titleLabel.font = Font.systemFont(11)
      titleLabel.textColor = new Color("#1e293b")
      titleLabel.lineLimit = 1

      widget.addSpacer(4)
    }
  }

  // 底部: 点击打开应用
  if (widgetSize !== SMALL_SIZE) {
    widget.addSpacer()

    const footer = widget.addStack()
    footer.layoutHorizontally()
    footer.centerAlignContent()

    footer.addSpacer()

    const tapHint = footer.addText("点击查看全部")
    tapHint.font = Font.systemFont(9)
    tapHint.textColor = new Color("#94a3b8")
  }
}

// 设置中等尺寸
if (widgetSize === MEDIUM_SIZE) {
  widget.presentMedium()
}

// 设置大尺寸
if (widgetSize === LARGE_SIZE) {
  widget.presentLarge()
}

// 渲染
await renderWidget()

// 添加点击事件
widget.addEvent(openUrl(CONFIG.appUrl))

// 最终输出
Script.setWidget(widget)
Script.complete()
