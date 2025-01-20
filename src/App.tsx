/**
 * @file Midjourney Toolbox - A tool for managing and analyzing Midjourney prompts
 * @author ziyitty <ziyitty@qq.com>
 * @copyright Copyright (c) 2025 ziyitty
 * @license MIT
 */

import React, { useState, useRef } from 'react'
import { TranslationService, translationServices } from './services/translation'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

// 参数说明接口
interface ParameterInfo {
  name: string;
  description: string;
  values?: string[];
  default?: string;
  type?: 'number' | 'text' | 'select';
  min?: number;
  max?: number;
  examples?: string;
}

// 参数说明数据
const PARAMETER_INFO: Record<string, ParameterInfo> = {
  'ar': {
    name: 'Aspect Ratio (宽高比)',
    description: '设置图像的宽高比。数值格式为 width:height，例如 16:9 生成宽屏图像。常用于控制构图和适配不同设备显示需求。',
    type: 'text',
    values: ['1:1', '16:9', '9:16', '4:3', '3:4', '2:1', '1:2'],
    examples: '16:9 生成宽屏图像，1:1 生成正方形图像'
  },
  'chaos': {
    name: 'Chaos (混沌度)',
    description: '控制图像的随机变化程度。值越高，生成的图像变化越大，越不可预测。范围 0-100。',
    type: 'number',
    min: 0,
    max: 100,
    examples: '较高的值会产生更有创意和意想不到的结果'
  },
  'quality': {
    name: 'Quality (质量)',
    description: '控制生成图像的质量和细节程度。.25 为低质量(较快)，.5 为中等质量，1 为最高质量(较慢)。',
    type: 'select',
    values: ['.25', '.5', '1'],
    default: '1',
    examples: '1 适合最终作品，.25 适合快速测试'
  },
  'seed': {
    name: 'Seed (种子)',
    description: '设置随机种子值。使用相同的种子值可以生成相似的图像，便于进行细微调整。',
    type: 'number',
    examples: '可用于在修改其他参数时保持图像的基本特征'
  },
  'stop': {
    name: 'Stop (停止)',
    description: '在指定完成百分比时停止生成。范围 10-100，可用于在图像完成前查看进度。',
    type: 'number',
    min: 10,
    max: 100,
    examples: '较低的值可以更快看到大致效果'
  },
  'style': {
    name: 'Style (风格)',
    description: '控制图像的整体风格。raw 表示更写实的风格，减少 AI 的艺术加工，更忠实于描述。',
    type: 'text',
    values: ['raw'],
    examples: 'raw 适合需要精确还原的场景'
  },
  'stylize': {
    name: 'Stylize (风格化)',
    description: '控制 AI 的艺术风格化强度。范围 0-1000，默认 100。值越高越具有 AI 特色，值越低越接近写实。',
    type: 'number',
    min: 0,
    max: 1000,
    default: '100',
    examples: '较低的值(如 20)适合照片级写实效果'
  },
  'tile': {
    name: 'Tile (平铺)',
    description: '生成可无缝平铺的图像，适合制作背景和纹理。',
    type: 'text',
    examples: '适合生成墙纸、织物图案等可重复的图像'
  },
  'version': {
    name: 'Version (版本)',
    description: '选择使用的 Midjourney 模型版本。不同版本具有不同的特点和能力。V5 以上版本支持更多细节控制。',
    type: 'text',
    values: ['5.0', '5.1', '5.2', '6.0'],
    examples: 'V6.0 是最新版本，具有更好的理解能力'
  },
  'weird': {
    name: 'Weird (怪异度)',
    description: '增加图像的怪异和超现实程度。范围 0-3000，值越高生成的图像越离奇。',
    type: 'number',
    min: 0,
    max: 3000,
    examples: '高值会产生更有创意和超现实的效果'
  },
  'iw': {
    name: 'Image Weight (图像权重)',
    description: '控制参考图片对生成结果的影响程度。范围 0-2：0完全忽略参考图片，1平衡参考和文字描述，2最大程度参考图片。',
    type: 'number',
    min: 0,
    max: 2,
    default: '1',
    examples: '2 适合需要严格参考原图风格的场景'
  },
  'v': {
    name: 'Version (版本)',
    description: '指定使用的 Midjourney 模型版本。不同版本有不同的特点：V5.0-V5.2 更适合写实风格，V6.0 提供更好的文本理解和创意表现。',
    type: 'select',
    values: ['5.0', '5.1', '5.2', '6.0'],
    default: '6.0',
    examples: 'V6.0 适合创意场景，V5.2 适合写实照片'
  },
  's': {
    name: 'Stylize (风格化)',
    description: '控制 AI 的艺术风格化程度。范围 0-1000，值越高图像越有艺术感，值越低越接近写实。100 为默认值。',
    type: 'number',
    min: 0,
    max: 1000,
    default: '100',
    examples: '低值(如 20)适合写实照片，高值(如 750)适合艺术创作'
  }
}

interface PromptAnalysis {
  imageUrls: string[];
  descriptions: string[];
  parameters: {
    name: string;
    value: string;
    enabled: boolean;
  }[];
}

// 添加映射接口
interface TextMapping {
  original: string;
  translated: string;
  index: number;
}

function App() {
  const [prompt, setPrompt] = useState('')
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null)
  const [editingParam, setEditingParam] = useState<string | null>(null)
  const [paramValue, setParamValue] = useState('')
  const [hoveredParam, setHoveredParam] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [imageScale, setImageScale] = useState(1)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageContainerSize, setImageContainerSize] = useState({ width: 0, height: 0 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [hoveredDescription, setHoveredDescription] = useState<number | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [translationError, setTranslationError] = useState<string | null>(null)

  // 添加翻译相关的状态
  const [selectedService, setSelectedService] = useState<TranslationService>(translationServices[0])
  const [translatedText, setTranslatedText] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)

  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  const [textMappings, setTextMappings] = useState<TextMapping[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const analyzePrompt = (text: string) => {
    // 提取图片URL（支持更多图片格式和链接模式）
    const imageUrlRegex = /https?:\/\/(?:[^\s<>"']+?\.(?:jpg|jpeg|gif|png|webp|bmp|svg)|s\.mj\.run\/[^\s<>"']+)(?:\?[^\s<>"']*)?/gi
    const imageUrls = Array.from(new Set(text.match(imageUrlRegex) || []))

    // 提取参数（以 -- 开头的部分）
    const paramRegex = /--([a-zA-Z0-9]+)(?:[:\s]+([^\s]+))?/g
    const parameters = Array.from(text.matchAll(paramRegex)).map(match => ({
      name: match[1],
      value: match[2] || '',
      enabled: true
    }))

    // 移除所有URL和参数,只保留描述文本
    let descriptionText = text
    // 移除所有URL
    descriptionText = descriptionText.replace(imageUrlRegex, '')
    // 移除所有参数及其后面的内容
    descriptionText = descriptionText.replace(/--.*$/, '')
    // 移除 @ 开头直到行尾或括号结束的内容
    descriptionText = descriptionText.replace(/@[^()]*(?:\([^)]*\))?/g, '')
    // 移除数字:数字格式
    descriptionText = descriptionText.replace(/\d+:\d+/g, '')
    // 移除孤立的数字
    descriptionText = descriptionText.replace(/\b\d+(\.\d+)?\b/g, '')
    // 移除括号及其内容
    descriptionText = descriptionText.replace(/\([^)]*\)/g, '')
    // 清理多余空格、逗号等
    descriptionText = descriptionText.replace(/\s*,\s*$/, '').trim()
    // 清理多余空格并分割成段落
    const descriptions = descriptionText.split('\n')
      .map(part => part.trim())
      .filter(part => part.length > 0)

    setAnalysis({
      imageUrls,
      descriptions,
      parameters
    })

    // 调试输出
    console.log('Found images:', imageUrls)
    console.log('Found descriptions:', descriptions)
    console.log('Found parameters:', parameters)

    // 自动翻译描述文本
    handleTranslate(descriptionText)
  }

  const updateParameter = (paramName: string, newValue: string) => {
    if (!analysis) return;

    // 如果没有提供新值，使用参数的默认值
    const defaultValue = PARAMETER_INFO[paramName]?.default || 
      (PARAMETER_INFO[paramName]?.type === 'number' ? 
        (PARAMETER_INFO[paramName]?.min !== undefined ? String(PARAMETER_INFO[paramName].min) : '1') : 
        (PARAMETER_INFO[paramName]?.values ? PARAMETER_INFO[paramName].values[0] : '1'));

    const valueToUse = newValue.trim() || defaultValue;
    
    // 更新提示词中的参数
    const paramRegex = new RegExp(`--${paramName}(?:[:\\s]+[^\\s]+)?\\s*`);
    const newPrompt = prompt.replace(
      paramRegex,
      `--${paramName} ${valueToUse} `
    );
    
    setPrompt(newPrompt.trim());
    analyzePrompt(newPrompt.trim());
    setEditingParam(null);
    setParamValue('');
  }

  // 修改点击添加参数的处理函数
  const handleAddParameter = (key: string) => {
    const info = PARAMETER_INFO[key];
    const defaultValue = info.default || 
      (info.type === 'number' ? 
        (info.min !== undefined ? String(info.min) : '1') : 
        (info.values ? info.values[0] : '1'));
    
    const newPrompt = `${prompt} --${key} ${defaultValue}`.trim();
    setPrompt(newPrompt);
    analyzePrompt(newPrompt);
  }

  // 处理翻译的函数
  const handleTranslate = async (text: string) => {
    if (!text) return
    
    setIsTranslating(true)
    setTranslationError(null)
    try {
      const result = await selectedService.translate(text)
      setTranslatedText(result)
      
      // 按句子分割英文文本（以句号、感叹号、问号结尾）
      const originalParts = text
        .split(/(?<=[.!?])\s+/)
        .filter(part => part.trim())
        .map(part => part.trim())
      
      // 按句子分割中文文本（以句号、感叹号、问号结尾）
      const translatedParts = result
        .split(/(?<=[。！？])\s*/)
        .filter(part => part.trim())
        .map(part => part.trim())
      
      // 创建映射数组，确保原文和译文一一对应
      const mappings = originalParts.map((part, index) => ({
        original: part,
        translated: translatedParts[index] || '',
        index
      }));
      
      setTextMappings(mappings)
    } catch (error) {
      console.error('翻译失败:', error)
      // 处理特定的错误码
      let errorMessage = '未知错误'
      if (error instanceof Error) {
        if (error.message.includes('54004')) {
          errorMessage = '翻译服务余额不足，请联系管理员充值'
        } else {
          errorMessage = error.message
        }
      }
      setTranslatedText('翻译失败')
      setTranslationError(errorMessage)
    } finally {
      setIsTranslating(false)
    }
  }

  // 添加文本分段函数
  const splitText = (text: string) => {
    return text.split(/([,.!?，。！？\s]+)/).filter(Boolean);
  }

  // 处理图片加载完成
  const handleImageLoad = () => {
    if (imageRef.current && containerRef.current) {
      setImageSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      })
      setImageContainerSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      })
    }
  }

  // 处理图片缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY * -0.01
    // 如果是缩小操作（delta < 0）且当前缩放比例已经是1，则不允许继续缩小
    if (delta < 0 && imageScale <= 1) {
      return
    }
    // 限制最小缩放比例为1，最大为5
    const newScale = Math.min(Math.max(1, imageScale + delta), 5)
    setImageScale(newScale)

    // 计算新的位置，保持鼠标指向的点不变
    if (imageRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const deltaX = (x - imagePosition.x) * (delta / imageScale)
      const deltaY = (y - imagePosition.y) * (delta / imageScale)

      setImagePosition(pos => ({
        x: pos.x - deltaX,
        y: pos.y - deltaY
      }))
    }
  }

  // 复制链接函数
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // 可以添加一个提示，但这里我们用UI效果代替
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  // 处理图片拖动
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y

    // 计算边界
    if (imageRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const scaledWidth = imageSize.width * imageScale
      const scaledHeight = imageSize.height * imageScale

      // 计算允许的最大移动范围
      const maxX = Math.max(0, (scaledWidth - containerRect.width) / 2)
      const maxY = Math.max(0, (scaledHeight - containerRect.height) / 2)

      // 限制在边界内
      const boundedX = Math.min(Math.max(newX, -maxX), maxX)
      const boundedY = Math.min(Math.max(newY, -maxY), maxY)

      setImagePosition({
        x: boundedX,
        y: boundedY
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 重置图片位置和缩放
  const resetImageView = () => {
    setImageScale(1)
    setImagePosition({ x: 0, y: 0 })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <header className="bg-white/50 backdrop-blur-lg sticky top-0 z-50 border-b border-purple-100/20">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Midjourney工具箱</h1>
            <div className="flex items-center space-x-4">
              <a
                href="mailto:ziyitty@qq.com"
                className="text-sm bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 px-4 py-2 rounded-full
                hover:from-indigo-500/20 hover:via-purple-500/20 hover:to-pink-500/20 transition-all duration-200
                border border-purple-100/20 backdrop-blur-sm flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span className="text-gray-700">ziyitty@qq.com</span>
              </a>
              <div className="text-sm text-gray-500 flex items-center space-x-2">
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-medium">
                  Created by ziyitty
                </span>
                <span className="text-xs">© 2025</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-purple-100/20">
          {/* 输入区域 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
                提示词
              </label>
              {/* 翻译服务选择 */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">翻译服务：</label>
                <select
                  className="form-select text-sm rounded-lg bg-white/50 border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={selectedService.name}
                  onChange={(e) => {
                    const service = translationServices.find(s => s.name === e.target.value)
                    if (service) {
                      setSelectedService(service)
                      if (analysis?.descriptions.length > 0) {
                        handleTranslate(analysis.descriptions[0])
                      }
                    }
                  }}
                >
                  {translationServices.map(service => (
                    <option key={service.name} value={service.name}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <textarea
              id="prompt"
              rows={4}
              className="form-textarea mt-1 block w-full rounded-xl border-purple-100 shadow-sm focus:border-purple-500 focus:ring-purple-500 bg-white/30 backdrop-blur-sm"
              value={prompt}
              onChange={(e) => {
                const newValue = e.target.value
                setPrompt(newValue)
                analyzePrompt(newValue)
              }}
              placeholder="请输入Midjourney提示词..."
            />
          </div>

          {/* 预览区域 */}
          {analysis && (
            <div className="space-y-8">
              {/* 图片预览和链接区域 */}
              {analysis.imageUrls.length > 0 && (
                <div className="bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-md rounded-xl p-6 shadow-lg border border-purple-100/20">
                  <h2 className="text-lg font-medium bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">图片预览</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {analysis.imageUrls.map((url, index) => (
                      <div key={index} className="bg-white/40 rounded-lg p-2 hover:bg-white/60 transition-all duration-200 hover:shadow-lg group">
                        {/* 图片预览 */}
                        <div 
                          className="aspect-square w-full rounded-lg overflow-hidden shadow-sm mb-2 relative group cursor-pointer"
                          onClick={() => setPreviewImage(url)}
                        >
                          <img
                            src={url}
                            alt={`预览图 ${index + 1}`}
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                          {/* 悬停提示 */}
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/50 via-purple-600/50 to-pink-600/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="text-white text-sm font-medium transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
                              点击查看大图
                            </div>
                          </div>
                        </div>
                        {/* 链接 */}
                        <div className="text-xs">
                          <button
                            onClick={() => copyToClipboard(url)}
                            className="w-full text-left text-indigo-600 hover:text-purple-600 group/link relative"
                          >
                            <span className="inline-block w-full truncate group-hover/link:bg-gradient-to-r from-indigo-50 to-purple-50 rounded transition-all duration-200 px-1">
                              {url.slice(0, 30)}...
                            </span>
                            {/* 悬停时显示完整链接和提示 */}
                            <div className="absolute left-0 bottom-full mb-1 hidden group-hover/link:block z-10">
                              <div className="bg-white rounded-lg shadow-lg p-2 text-sm max-w-md">
                                <div className="text-gray-600 mb-1">点击复制链接</div>
                                <div className="text-gray-800 break-all">{url}</div>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 图片描述和翻译结果区域 */}
              {analysis.descriptions.length > 0 && (
                <div className="grid grid-cols-2 gap-6">
                  {/* 图片描述 */}
                  <div className="bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-md rounded-xl p-6 shadow-lg border border-purple-100/20">
                    <h2 className="text-lg font-medium bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">图片描述</h2>
                    <div className="space-y-2">
                      {analysis.descriptions.map((desc, descIndex) => (
                        <div key={descIndex} className="p-3 rounded-lg bg-white/40">
                          {textMappings.map((mapping, index) => (
                            <span
                              key={index}
                              className={`
                                block my-1
                                ${hoveredIndex === mapping.index 
                                  ? 'bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg px-2 py-1 shadow-sm' 
                                  : 'px-2 py-1'
                                }
                              `}
                              onMouseEnter={() => setHoveredIndex(mapping.index)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            >
                              {mapping.original}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 翻译结果 */}
                  <div className="bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-md rounded-xl p-6 shadow-lg border border-purple-100/20">
                    <h2 className="text-lg font-medium bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">翻译结果</h2>
                    <div className="space-y-2">
                      {isTranslating ? (
                        <div className="p-3 bg-white/40 rounded-lg">
                          <p className="text-gray-500">正在翻译...</p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-white/40">
                          {textMappings.map((mapping, index) => (
                            <span
                              key={index}
                              className={`
                                block my-1
                                ${hoveredIndex === mapping.index 
                                  ? 'bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg px-2 py-1 shadow-sm' 
                                  : 'px-2 py-1'
                                }
                              `}
                              onMouseEnter={() => setHoveredIndex(mapping.index)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            >
                              {mapping.translated}
                            </span>
                          ))}
                          {translationError && (
                            <div className="mt-2 text-sm flex items-center justify-between">
                              <span className="text-red-500 flex-1">
                                {translationError}
                              </span>
                              <button
                                onClick={() => handleTranslate(analysis?.descriptions[0] || '')}
                                className="ml-4 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full hover:from-indigo-600 hover:to-purple-600 transition-colors duration-200 text-xs flex items-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                重试
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 参数区域 */}
              <div className="grid grid-cols-2 gap-6">
                {/* 启用的参数 */}
                <div className="bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-md rounded-xl p-6 shadow-lg border border-purple-100/20">
                  <h2 className="text-lg font-medium bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">启用的参数</h2>
                  <div className="flex flex-wrap gap-2">
                    {analysis.parameters.map((param, index) => (
                      <div key={index} className="relative">
                        {editingParam === param.name ? (
                          // 编辑状态
                          <div className="relative">
                            <div className="p-2 bg-white/60 rounded-lg flex items-center gap-2 shadow-sm">
                              <input
                                type={PARAMETER_INFO[param.name]?.type === 'number' ? 'number' : 'text'}
                                className="form-input w-24 text-sm rounded border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                                value={paramValue}
                                onChange={(e) => setParamValue(e.target.value)}
                                min={PARAMETER_INFO[param.name]?.min}
                                max={PARAMETER_INFO[param.name]?.max}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateParameter(param.name, paramValue)
                                  } else if (e.key === 'Escape') {
                                    setEditingParam(null)
                                    setParamValue('')
                                  }
                                }}
                                autoFocus
                              />
                              <button
                                onClick={() => updateParameter(param.name, paramValue)}
                                className="p-1 text-green-600 hover:text-green-700 transition-colors"
                                title="确认"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  setEditingParam(null)
                                  setParamValue('')
                                }}
                                className="p-1 text-red-600 hover:text-red-700 transition-colors"
                                title="取消"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            {/* 编辑状态下的参数说明 */}
                            {PARAMETER_INFO[param.name] && (
                              <div className="absolute bottom-full left-0 mb-2 z-[9999] w-64 p-4 bg-white rounded-xl shadow-xl border border-purple-100">
                                <h3 className="font-medium text-gray-900 mb-1">{PARAMETER_INFO[param.name].name}</h3>
                                <p className="text-sm text-gray-600">{PARAMETER_INFO[param.name].description}</p>
                                {PARAMETER_INFO[param.name].examples && (
                                  <p className="text-sm text-gray-500 mt-2">
                                    <span className="font-medium">示例：</span>
                                    {PARAMETER_INFO[param.name].examples}
                                  </p>
                                )}
                                {PARAMETER_INFO[param.name].values && (
                                  <p className="text-sm text-gray-500 mt-2">
                                    <span className="font-medium">可选值：</span>
                                    {PARAMETER_INFO[param.name].values.join(', ')}
                                  </p>
                                )}
                                {PARAMETER_INFO[param.name].type === 'number' && (
                                  <p className="text-sm text-gray-500 mt-2">
                                    <span className="font-medium">取值范围：</span>
                                    {PARAMETER_INFO[param.name].min !== undefined && 
                                     PARAMETER_INFO[param.name].max !== undefined ? (
                                      `${PARAMETER_INFO[param.name].min} - ${PARAMETER_INFO[param.name].max}`
                                    ) : (
                                      '无限制'
                                    )}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          // 显示状态
                          <div
                            className="p-2 bg-white/40 rounded-lg hover:bg-white/60 transition-colors duration-200 cursor-pointer group relative"
                            onMouseEnter={() => setHoveredParam(`enabled-${param.name}`)}
                            onMouseLeave={() => setHoveredParam(null)}
                            onClick={() => {
                              setEditingParam(param.name)
                              setParamValue(param.value || '')
                            }}
                          >
                            <span className="text-gray-700">{`${param.name}${param.value ? ': ' + param.value : ''}`}</span>
                            <span className="ml-2 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              点击编辑
                            </span>
                          </div>
                        )}
                        {/* 悬停状态的参数说明 */}
                        {!editingParam && hoveredParam === `enabled-${param.name}` && PARAMETER_INFO[param.name] && (
                          <div className="absolute bottom-full left-0 mb-2 z-[9999] w-64 p-4 bg-white rounded-xl shadow-xl border border-purple-100">
                            <h3 className="font-medium text-gray-900 mb-1">{PARAMETER_INFO[param.name].name}</h3>
                            <p className="text-sm text-gray-600">{PARAMETER_INFO[param.name].description}</p>
                            {PARAMETER_INFO[param.name].examples && (
                              <p className="text-sm text-gray-500 mt-2">
                                <span className="font-medium">示例：</span>
                                {PARAMETER_INFO[param.name].examples}
                              </p>
                            )}
                            {PARAMETER_INFO[param.name].values && (
                              <p className="text-sm text-gray-500 mt-2">
                                <span className="font-medium">可选值：</span>
                                {PARAMETER_INFO[param.name].values.join(', ')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 未启用的参数 */}
                <div className="bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-md rounded-xl p-6 shadow-lg border border-purple-100/20">
                  <h2 className="text-lg font-medium bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">可用参数</h2>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(PARAMETER_INFO)
                      .filter(([key]) => !analysis.parameters.some(p => p.name === key))
                      .map(([key, info]) => (
                        <div key={key} className="relative">
                          <div
                            className="p-2 bg-white/20 rounded-lg hover:bg-white/40 transition-colors duration-200 cursor-pointer"
                            onMouseEnter={() => setHoveredParam(`available-${key}`)}
                            onMouseLeave={() => setHoveredParam(null)}
                            onClick={() => handleAddParameter(key)}
                          >
                            <span className="text-gray-500">{key}</span>
                          </div>
                          {hoveredParam === `available-${key}` && (
                            <div 
                              className="absolute bottom-full left-0 mb-2 z-[9999] w-64 p-4 bg-white rounded-xl shadow-xl border border-purple-100"
                            >
                              <h3 className="font-medium text-gray-900 mb-1">{info.name}</h3>
                              <p className="text-sm text-gray-600">{info.description}</p>
                              {info.examples && (
                                <p className="text-sm text-gray-500 mt-2">
                                  <span className="font-medium">示例：</span>
                                  {info.examples}
                                </p>
                              )}
                              {info.values && (
                                <p className="text-sm text-gray-500 mt-2">
                                  <span className="font-medium">可选值：</span>
                                  {info.values.join(', ')}
                                </p>
                              )}
                              <p className="text-xs text-purple-600 mt-2">点击添加此参数</p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 图片预览模态框 */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-7xl w-full h-[85vh] bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors duration-200 z-10"
              onClick={() => setPreviewImage(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={4}
              centerOnInit={true}
              wheel={{ wheelDisabled: false }}
              doubleClick={{ mode: "reset" }}
              limitToBounds={true}
              panning={{ disabled: false }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="absolute bottom-4 left-4 flex space-x-2 z-10">
                    <button
                      onClick={() => zoomIn()}
                      className="p-2 bg-white/80 rounded-lg hover:bg-white transition-colors duration-200 text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => zoomOut()}
                      className="p-2 bg-white/80 rounded-lg hover:bg-white transition-colors duration-200 text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => resetTransform()}
                      className="p-2 bg-white/80 rounded-lg hover:bg-white transition-colors duration-200 text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  <TransformComponent 
                    wrapperClass="!w-full !h-[calc(85vh-2rem)] flex items-center justify-center" 
                    contentClass="!w-full !h-full flex items-center justify-center"
                  >
                    <img
                      src={previewImage}
                      alt="预览图"
                      className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-lg"
                      draggable={false}
                    />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>
        </div>
      )}
    </div>
  )
}

export default App 