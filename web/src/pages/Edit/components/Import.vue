<template>
  <el-dialog class="nodeImportDialog" :title="$t('import.title')" :visible.sync="dialogVisible" width="300px">
    <el-upload ref="upload" action="x" accept=".smm,.json,.xmind,.xlsx,.md" :file-list="fileList" :auto-upload="false"
      :multiple="false" :on-change="onChange" :on-remove="onRemove" :limit="1" :on-exceed="onExceed">
      <el-button slot="trigger" size="small" type="primary">{{
        $t('import.selectFile')
      }}</el-button>
      <div slot="tip" class="el-upload__tip">
        {{ $t('import.supportFile') }}
      </div>
    </el-upload>
    <span slot="footer" class="dialog-footer">
      <el-button @click="cancel">{{ $t('dialog.cancel') }}</el-button>
      <el-button type="primary" @click="confirm">{{
        $t('dialog.confirm')
      }}</el-button>
    </span>
  </el-dialog>
</template>

<script>
import xmind from 'simple-mind-map/src/parse/xmind.js'
import markdown from 'simple-mind-map/src/parse/markdown.js'
import { fileToBuffer } from '@/utils'
import { read, utils } from 'xlsx'
import { mapMutations } from 'vuex'

/**
 * @Author: 王林
 * @Date: 2021-06-24 22:53:54
 * @Desc: 导入
 */
export default {
  name: 'Import',
  data() {
    return {
      dialogVisible: false,
      fileList: [],
      isReciving: false,
      recivingTimer: null
    }
  },
  watch: {
    dialogVisible(val, oldVal) {
      if (!val && oldVal) {
        this.fileList = []
      }
    }
  },
  async created() {
    this.$bus.$on('showImport', this.handleShowImport)
    this.$bus.$on('handle_file_url', this.handleFileURL)
    await this.initMind()
  },
  beforeDestroy() {
    this.$bus.$off('showImport', this.handleShowImport)
    this.$bus.$off('handle_file_url', this.handleFileURL)
  },
  methods: {
    ...mapMutations(['setActiveSidebar']),

    handleShowImport() {
      this.dialogVisible = true
    },
    async initMind() {
      if (this.$route.query.mindValue) {
        let data = await markdown.transformMarkdownTo(
          this.$route.query.mindValue
        )
        this.$bus.$emit('setData', data)
      }
      window.addEventListener(
        'message',
        async event => {
          if (event.data.type === 'value') {
            let items = event.data.value.split("\n")
            let count = 0
            for (let i in items) {
              if (items[i].search(/^#[^#].+/) != -1) {
                if(count >= 1){
                  items[i] = "";
                }
                count++
              }
            }
            let data1 = await markdown.transformMarkdownTo(items.join("\n"))
            if (this.recivingTimer) {
              clearTimeout(this.recivingTimer);
            }
            this.recivingTimer = setTimeout(() => {
              this.$bus.$emit('setData', data1);
            }, 1500);
            if (this.isReciving) {
              return;
            }
            this.$bus.$emit('setData', data1)
            this.isReciving = true;
            setTimeout(() => {
              this.isReciving = false;
            }, 1000);
          } else {
            console.log(event.data)
          }
        },
        false
      )
    },

    // 检查url中是否操作需要打开的文件
    async handleFileURL() {
      try {
        const fileURL = this.$route.query.fileURL
        if (!fileURL) return
        const macth = /\.(smm|json|xmind|md|xlsx)$/.exec(fileURL)
        if (!macth) {
          return
        }
        const type = macth[1]
        const res = await fetch(fileURL)
        const file = await res.blob()
        const data = {
          raw: file
        }
        if (type === 'smm' || type === 'json') {
          this.handleSmm(data)
        } else if (type === 'xmind') {
          this.handleXmind(data)
        } else if (type === 'xlsx') {
          this.handleExcel(data)
        } else if (type === 'md') {
          this.handleMd(data)
        }
      } catch (error) {
        console.log(error)
      }
    },

    /**
     * @Author: 王林
     * @Date: 2021-08-03 22:48:42
     * @Desc: 文件选择
     */
    onChange(file) {
      let reg = /\.(smm|xmind|json|xlsx|md)$/
      if (!reg.test(file.name)) {
        this.$message.error(this.$t('import.enableFileTip'))
        this.fileList = []
      } else {
        this.fileList.push(file)
      }
    },

    // 移除文件
    onRemove(file, fileList) {
      this.fileList = fileList
    },

    /**
     * @Author: 王林
     * @Date: 2021-08-03 22:48:47
     * @Desc: 数量超出限制
     */
    onExceed() {
      this.$message.error(this.$t('import.maxFileNum'))
    },

    /**
     * @Author: 王林
     * @Date: 2021-06-22 22:08:11
     * @Desc: 取消
     */
    cancel() {
      this.dialogVisible = false
    },

    /**
     * @Author: 王林
     * @Date: 2021-06-06 22:28:20
     * @Desc:  确定
     */
    confirm() {
      if (this.fileList.length <= 0) {
        return this.$message.error(this.$t('import.notSelectTip'))
      }
      this.$store.commit('setIsHandleLocalFile', false)
      let file = this.fileList[0]
      if (/\.(smm|json)$/.test(file.name)) {
        this.handleSmm(file)
      } else if (/\.xmind$/.test(file.name)) {
        this.handleXmind(file)
      } else if (/\.xlsx$/.test(file.name)) {
        this.handleExcel(file)
      } else if (/\.md$/.test(file.name)) {
        this.handleMd(file)
      }
      this.cancel()
      this.setActiveSidebar(null)
    },

    /**
     * @Author: 王林25
     * @Date: 2022-10-24 14:19:33
     * @Desc: 处理.smm文件
     */
    handleSmm(file) {
      let fileReader = new FileReader()
      fileReader.readAsText(file.raw)
      fileReader.onload = evt => {
        try {
          let data = JSON.parse(evt.target.result)
          if (typeof data !== 'object') {
            throw new Error(this.$t('import.fileContentError'))
          }
          this.$bus.$emit('setData', data)
          this.$message.success(this.$t('import.importSuccess'))
        } catch (error) {
          console.log(error)
          this.$message.error(this.$t('import.fileParsingFailed'))
        }
      }
    },

    /**
     * @Author: 王林25
     * @Date: 2022-10-24 14:19:41
     * @Desc: 处理.xmind文件
     */
    async handleXmind(file) {
      try {
        let data = await xmind.parseXmindFile(file.raw)
        this.$bus.$emit('setData', data)
        this.$message.success(this.$t('import.importSuccess'))
      } catch (error) {
        console.log(error)
        this.$message.error(this.$t('import.fileParsingFailed'))
      }
    },

    /**
     * @Author: 王林25
     * @Date: 2022-10-24 14:19:51
     * @Desc: 处理.xlsx文件
     */
    async handleExcel(file) {
      try {
        const wb = read(await fileToBuffer(file.raw))
        const data = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
          header: 1
        })
        if (data.length <= 0) {
          return
        }
        let max = 0
        data.forEach(arr => {
          if (arr.length > max) {
            max = arr.length
          }
        })
        let layers = []
        let walk = layer => {
          if (!layers[layer]) {
            layers[layer] = []
          }
          for (let i = 0; i < data.length; i++) {
            if (data[i][layer]) {
              let node = {
                data: {
                  text: data[i][layer]
                },
                children: [],
                _row: i
              }
              layers[layer].push(node)
            }
          }
          if (layer < max - 1) {
            walk(layer + 1)
          }
        }
        walk(0)
        let getParent = (arr, row) => {
          for (let i = arr.length - 1; i >= 0; i--) {
            if (row >= arr[i]._row) {
              return arr[i]
            }
          }
        }
        for (let i = 1; i < layers.length; i++) {
          let arr = layers[i]
          for (let j = 0; j < arr.length; j++) {
            let item = arr[j]
            let parent = getParent(layers[i - 1], item._row)
            if (parent) {
              parent.children.push(item)
            }
          }
        }
        this.$bus.$emit('setData', layers[0][0])
        this.$message.success(this.$t('import.importSuccess'))
      } catch (error) {
        console.log(error)
        this.$message.error(this.$t('import.fileParsingFailed'))
      }
    },

    // 处理markdown文件
    async handleMd(file) {
      let fileReader = new FileReader()
      fileReader.readAsText(file.raw)
      fileReader.onload = async evt => {
        try {
          const text = `# 中国历史五千年脉络

## 1 古代历史
### 1.1 夏商西周时期
#### 1.1.1 夏朝
- 传说中的启蒙时代
- 有关夏朝的历史文献
#### 1.1.2 商朝
- 商朝的兴起和发展
- 商朝的政治制度演变
- 商朝的经济特点
- 商朝的文化成就
### 1.2 春秋战国时期
#### 1.2.1 春秋战国概述
- 春秋时期国家分裂
- 战国时期兵戎相见
#### 1.2.2 孔子与儒家
- 孔子的生平及思想
- 儒家的核心价值观
#### 1.2.3 秦始皇统一中国
- 秦始皇的改革和统一行动
- 秦始皇的法制建设
- 秦始皇的文化政策
### 1.3 隋唐五代时期
#### 1.3.1 隋朝
- 隋朝的建立与统一
- 隋朝的政治制度
- 隋朝的开国皇帝
#### 1.3.2 唐朝
- 唐朝的盛世和文化繁荣
- 唐朝的经济发展
- 唐朝的外交政策
#### 1.3.3 五代十国
- 五代十国时期的政治动荡
- 五代十国的文化交流
## 2 中世纪历史
### 2.1 唐宋元明清时期
#### 2.1.1 唐朝（618-907年）
- 唐朝开创了盛世，实行科举制度
- 唐朝诗歌达到高峰，杜牧、李白等诗人著名
#### 2.1.2 宋朝（960-1279年）
- 宋朝推行王安石变法
- 宋朝始终受到金朝、蒙古帝国侵袭
#### 2.1.3 元朝（1271-1368年）
- 元世祖忽必烈灭掉南宋，建立元朝
- 元朝实行蒙古骑兵政策，实行行省制度
### 2.2 明清时期
#### 2.2.1 明朝（1368-1644年）
- 明朝实行海禁政策
- 明朝永乐大典成书，明孝陵、故宫等建筑兴盛
#### 2.2.2 清朝（1644-1912年）
- 清朝入主中原，推行满汉分治政策
- 清朝康雍乾盛世，科举制度得到完善
### 2.3 中世纪重要事件
#### 2.3.1 百年战争
- 英法之间的长期战争，对两国都造成沉重损失
- 代表人物有爱德华三世、查理六世等
#### 2.3.2 马可·波罗东游
- 意大利旅行家马可·波罗访问中国
- 记载了中国的经济、文化等情况
## 3 近代历史
### 3.1 清朝末年
#### 3.1.1 辛亥革命
- 辛亥革命于1911年爆发，推翻了清朝统治。
- 辛亥革命是中国近代史上第一次资产阶级性质的民主革命。
#### 3.1.2 八国联军入侵
- 1900年，八国联军侵略中国，焚烧圆明园，导致清政府签订不平等条约。
- 八国联军入侵使清王朝进一步衰落。
### 3.2 民国时期
#### 3.2.1 孙中山与国民党
- 孙中山创立中国国民党，提出三民主义，推动了辛亥革命的成功。
- 国民党在中国近代史中扮演着重要角色。
#### 3.2.2 蒋介石与国共内战
- 蒋介石领导国民党，与共产党进行了长期的内战。
- 国共内战最终以共产党胜利结束，建立了中华人民共和国。
### 3.3 中华人民共和国成立
#### 3.3.1 共和国建立
- 1949年10月1日，中华人民共和国在北京宣告成立。
- 中华人民共和国的成立标志着中国进入社会主义制度。
#### 3.3.2 改革开放
- 1978年，中国开始实行改革开放政策，向市场经济方向转变。
- 改革开放使中国经济迅速发展，逐步跻身世界大国之列。

# 中国历史五千年脉络

## 4 当代历史

### 4.1 中华人民共和国成立
#### 4.1.1 解放战争胜利
- 1949年10月1日，中华人民共和国正式成立。
- 中国共产党取得解放战争的胜利。

#### 4.1.2 国共内战
- 国共内战结束，国共双方建立了不同的政权。
- 共产党取得了最终胜利，国民党改组到台湾。

### 4.2 文化大革命
#### 4.2.1 红卫兵运动
- 文化大革命爆发，红卫兵成为主要运动力量。
- 学校停课，各界秩序被打破。

#### 4.2.2 邓小平上台
- 文革结束后，邓小平提出改革开放政策。
- 文化大革命给国家带来沉重的伤痛，经济遭受严重破坏。

### 4.3 对外开放
#### 4.3.1 经济特区
- 1978年，中国建立了深圳经济特区。
- 经济特区逐渐发展成现代化城市。

#### 4.3.2 中国加入WTO
- 2001年中国加入世界贸易组织（WTO）。
- 对外开放步伐加快，与国际接轨。

### 4.4 台湾问题
#### 4.4.1 一国两制
- 大陆持续推行一国两制政策。
- 台湾地区与大陆关系紧张，一国两制难以实现。

#### 4.4.2 台海局势
- 台海局势不断紧张，两岸关系时有波动。
- 台湾地位问题成为国际焦点。

### 4.5 北京奥运会
#### 4.5.1 筹备过程
- 北京成功申办2008年奥运会。
- 环保、交通等问题备受关注。

#### 4.5.2 开幕式
- 2008年北京奥运会开幕式震撼世界。
- 中华文化展示给世界各国观众。
`
          let data = await markdown.transformMarkdownTo(text)
          // console.log(evt.target.result);
          this.$bus.$emit('setData', data)
          this.$message.success(this.$t('import.importSuccess'))
        } catch (error) {
          console.log(error)
          this.$message.error(this.$t('import.fileParsingFailed'))
        }
      }
    }
  }
}
</script>

<style lang="less" scoped>
.nodeImportDialog {}
</style>
