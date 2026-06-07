/**
 * 客户信息映射规则引擎
 * 纯本地运行，无需网络
 */

// 内置默认字段映射规则
export const DEFAULT_MAPPING_RULES: Record<string, {
  label: string
  required: boolean
  aliases: string[]
}> = {
  companyName: {
    label: '公司名称',
    required: true,
    aliases: [
      '公司名称', '客户名称', '公司', '客户', '单位名称',
      '企业名称', '单位', '企业', '名', '公司全称', '客户公司'
    ]
  },
  shortName: {
    label: '公司简称',
    required: false,
    aliases: ['简称', '公司简称', '客户简称', '缩写', '企业简称']
  },
  city: {
    label: '城市',
    required: false,
    aliases: [
      '城市', '所在城市', '市', '所在市', '地区',
      '省份', '省市', '区域', '目标市场'
    ]
  },
  address: {
    label: '详细地址',
    required: false,
    aliases: [
      '地址', '详细地址', '公司地址', '联系地址',
      '办公地址', '单位地址', '所在地', '公司地址'
    ]
  },
  contactPerson: {
    label: '联系人',
    required: false,
    aliases: [
      '联系人', '对接人', '负责人', '姓名', '对接人姓名',
      '联系人姓名', '商务联系人', '业务联系人', '业务负责人'
    ]
  },
  phone: {
    label: '联系电话',
    required: false,
    aliases: [
      '电话', '联系方式', '联系电话', '手机', '手机号码',
      '手机号', '座机', 'TEL', 'Tel', '电话/手机', '联系方式'
    ]
  },
  email: {
    label: '邮箱',
    required: false,
    aliases: [
      '邮箱', '电子邮箱', 'E-mail', 'email',
      '邮件', 'QQ邮箱', '电子信箱'
    ]
  },
  notes: {
    label: '备注',
    required: false,
    aliases: [
      '备注', '说明', '产品需求', '备注信息', '其他',
      '补充说明', '需求', '描述', '主要产品', '客户阶段'
    ]
  }
}

// 映射模板接口
export interface MappingTemplate {
  name: string
  mapping: Record<string, string>
  createTime: string
}

export interface CustomerData {
  id: string
  companyName: string
  shortName: string
  city: string
  address: string
  contactPerson: string
  phone: string
  email: string
  notes: string
  updateTime: string
}

/**
 * 自动匹配列名
 * @param headers 表头数组
 * @returns 字段到列名的映射
 */
export function autoMatchColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}

  Object.keys(DEFAULT_MAPPING_RULES).forEach(field => {
    const rule = DEFAULT_MAPPING_RULES[field]

    // 精确匹配优先
    let matchedColumn = headers.find(h =>
      h.toLowerCase() === rule.label.toLowerCase()
    )

    // 别名匹配
    if (!matchedColumn) {
      for (const alias of rule.aliases) {
        const found = headers.find(h =>
          h.toLowerCase().includes(alias.toLowerCase()) ||
          alias.toLowerCase().includes(h.toLowerCase())
        )
        if (found) {
          matchedColumn = found
          break
        }
      }
    }

    if (matchedColumn) {
      mapping[field] = matchedColumn
    }
  })

  return mapping
}

/**
 * 数据清洗与格式化
 * @param rows 数据行（对象形式）
 * @param mapping 字段映射
 * @returns 清洗后的客户数据数组
 */
export function cleanCustomerData(
  rows: Record<string, string>[],
  mapping: Record<string, string>
): CustomerData[] {
  const customers: CustomerData[] = []

  rows.forEach((row) => {
    const companyName = mapping.companyName ? row[mapping.companyName]?.trim() : ''

    // 跳过空行或没有公司名称的行
    if (!companyName) return

    const customer: CustomerData = {
      id: crypto.randomUUID(),
      companyName: companyName,
      shortName: mapping.shortName && row[mapping.shortName]?.trim()
        ? row[mapping.shortName].trim()
        : generateShortName(companyName),
      city: mapping.city && row[mapping.city]?.trim()
        ? row[mapping.city].trim()
        : extractCityFromAddress(mapping.address ? row[mapping.address] : ''),
      address: mapping.address ? row[mapping.address]?.trim() || '' : '',
      contactPerson: mapping.contactPerson ? row[mapping.contactPerson]?.trim() || '' : '',
      phone: mapping.phone ? formatPhoneNumber(row[mapping.phone]?.trim() || '') : '',
      email: mapping.email ? row[mapping.email]?.trim() || '' : '',
      notes: mapping.notes ? row[mapping.notes]?.trim() || '' : '',
      updateTime: new Date().toISOString()
    }

    customers.push(customer)
  })

  return customers
}

/**
 * 生成公司简称
 */
function generateShortName(fullName: string): string {
  if (!fullName) return ''

  // 移除常见后缀
  const suffixes = ['有限公司', '有限责任公司', '股份有限公司', '集团', '公司', '企业', 'Co., Ltd.', 'Ltd.']
  let shortName = fullName

  suffixes.forEach(suffix => {
    shortName = shortName.replace(new RegExp(suffix, 'g'), '')
  })

  // 移除括号内容
  shortName = shortName.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '')

  // 移除多余空格
  shortName = shortName.replace(/\s+/g, '').trim()

  // 保留前6个字符
  return shortName.substring(0, 6)
}

/**
 * 从地址中提取城市
 */
function extractCityFromAddress(address: string): string {
  if (!address) return ''

  // 常见城市列表
  const cities = [
    '北京', '上海', '广州', '深圳', '杭州', '南京', '苏州', '成都', '重庆',
    '武汉', '西安', '郑州', '长沙', '合肥', '济南', '青岛', '厦门', '福州',
    '宁波', '无锡', '常州', '南通', '东莞', '佛山', '中山', '惠州', '江门',
    '肇庆', '珠海', '天津', '沈阳', '大连', '哈尔滨', '长春', '昆明', '贵阳',
    '南宁', '石家庄', '太原', '兰州', '乌鲁木齐', '呼和浩特', '银川', '海口',
    '三亚', '拉萨', '西宁'
  ]

  for (const city of cities) {
    if (address.includes(city)) {
      return city
    }
  }

  // 匹配省市格式
  const provinceCityPattern = /(.*?)(?:省|市|自治区)/
  const match = address.match(provinceCityPattern)
  if (match && match[1]) {
    return match[1]
  }

  return ''
}

/**
 * 格式化电话号码
 */
function formatPhoneNumber(phone: string): string {
  if (!phone) return ''

  // 移除所有非数字字符（保留+号用于国际号码）
  return phone.replace(/[^\d+]/g, '')
}

/**
 * 获取映射模板列表
 */
export function getMappingTemplates(): Record<string, MappingTemplate> {
  try {
    return JSON.parse(localStorage.getItem('customerMappingTemplates') || '{}')
  } catch {
    return {}
  }
}

/**
 * 保存映射模板
 */
export function saveMappingTemplate(name: string, mapping: Record<string, string>): void {
  const templates = getMappingTemplates()
  templates[name] = {
    name,
    mapping,
    createTime: new Date().toISOString()
  }
  localStorage.setItem('customerMappingTemplates', JSON.stringify(templates))
}

/**
 * 删除映射模板
 */
export function deleteMappingTemplate(name: string): void {
  const templates = getMappingTemplates()
  delete templates[name]
  localStorage.setItem('customerMappingTemplates', JSON.stringify(templates))
}

/**
 * 获取匹配统计
 */
export function getMatchStats(
  _headers: string[],
  mapping: Record<string, string>
): { matched: number; total: number; matchedFields: string[] } {
  const matchedFields: string[] = []
  let matched = 0

  Object.keys(DEFAULT_MAPPING_RULES).forEach(field => {
    if (mapping[field]) {
      matchedFields.push(DEFAULT_MAPPING_RULES[field].label)
      matched++
    }
  })

  return {
    matched,
    total: Object.keys(DEFAULT_MAPPING_RULES).length,
    matchedFields
  }
}

/**
 * 计算匹配准确度
 */
export function calculateMatchAccuracy(mapping: Record<string, string>): number {
  const requiredFields = Object.entries(DEFAULT_MAPPING_RULES)
    .filter(([_, rule]) => rule.required)
    .map(([field]) => field)

  const matchedRequired = requiredFields.filter(f => mapping[f])

  if (requiredFields.length === 0) return 100

  return Math.round((matchedRequired.length / requiredFields.length) * 100)
}