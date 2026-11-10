((root)=>{
  const keys={name:/^(?:产品名称|英文名称|英文名|商品名称|product name|product|name)$/i,alias:/^(?:中文名称|中文名|别名|chinese name|alias|synonyms?)$/i,category:/^(?:产品类别|类别|分类|category|type)$/i,cas:/^(?:cas(?:编号|号|\s*(?:number|no\.?))?)$/i,description:/^(?:产品说明|产品描述|说明|描述|简介|description|summary)$/i,keywords:/^(?:关键词|关键字|keywords?|search terms?)$/i,image:/^(?:图片链接|图片|image(?: url)?|photo)$/i};
  function parse(text){
    const result={};
    for(const original of String(text||'').split(/\r?\n/)){
      const line=original.trim().replace(/^[-*]\s*/,''),match=line.match(/^(?:\*\*)?([^:：|]{1,35}?)(?:\*\*)?\s*[:：|]\s*(.+?)\s*$/);
      if(match){const key=match[1].replace(/\*/g,'').trim();for(const [field,pattern] of Object.entries(keys))if(pattern.test(key)&&!result[field])result[field]=match[2].trim().replace(/\*\*/g,'');}
      if(!result.name&&/^#{1,2}\s+\S/.test(line))result.name=line.replace(/^#{1,2}\s+/,'').trim();
    }
    const cas=String(text||'').match(/\b\d{2,7}-\d{2}-\d\b/);if(!result.cas&&cas)result.cas=cas[0];
    const image=String(text||'').match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/i);if(!result.image&&image)result.image=image[1];
    return result;
  }
  root.ProductImport={parse};
})(globalThis);
