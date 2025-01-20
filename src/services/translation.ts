import CryptoJS from 'crypto-js';

// JSONP 工具函数
function jsonp(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_' + Date.now() + Math.round(Math.random() * 1000000);
    (window as any)[callbackName] = (response: any) => {
      delete (window as any)[callbackName];
      document.head.removeChild(script);
      if (response.error_code) {
        reject(new Error(`${response.error_code}: ${response.error_msg}`));
      } else {
        resolve(response);
      }
    };

    const script = document.createElement('script');
    script.src = `${url}&callback=${callbackName}`;
    script.onerror = () => {
      delete (window as any)[callbackName];
      document.head.removeChild(script);
      reject(new Error('网络请求失败'));
    };
    document.head.appendChild(script);
  });
}

// 翻译服务接口
export interface TranslationService {
  name: string;
  translate: (text: string) => Promise<string>;
}

// 百度翻译
export const baiduTranslate: TranslationService = {
  name: '百度翻译',
  translate: async (text: string) => {
    try {
      const appid = '20220824001317903';
      const key = 'RvqQdEeu1NcDyhFfmsV_';
      const salt = new Date().getTime().toString();
      const sign = CryptoJS.MD5(appid + text + salt + key).toString();
      
      const params = new URLSearchParams({
        q: text,
        from: 'auto',
        to: 'zh',
        appid,
        salt,
        sign,
      });
      
      const url = `https://api.fanyi.baidu.com/api/trans/vip/translate?${params.toString()}`;
      console.log('翻译请求 URL:', url);
      
      const response = await jsonp(url);
      console.log('翻译响应数据:', response);
      
      if (!response.trans_result || !response.trans_result[0]) {
        throw new Error('翻译结果格式错误');
      }
      
      return response.trans_result[0].dst;
    } catch (error) {
      console.error('百度翻译详细错误:', error);
      if (error instanceof Error) {
        throw new Error(`翻译失败: ${error.message}`);
      } else {
        throw new Error('翻译失败: 未知错误');
      }
    }
  }
};

// 谷歌翻译
export class GoogleTranslationService implements TranslationService {
  name = '谷歌翻译'

  async translate(text: string): Promise<string> {
    try {
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh&dt=t&q=${encodeURIComponent(text)}`)
      const data = await response.json()
      return data[0].map((item: any[]) => item[0]).join('')
    } catch (error) {
      console.error('谷歌翻译错误:', error)
      throw new Error(`谷歌翻译失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }
}

// 导出翻译服务列表
export const translationServices: TranslationService[] = [
  new GoogleTranslationService(),
  baiduTranslate
]; 