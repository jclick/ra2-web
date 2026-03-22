# 从 ra2yuri 仓库提取的资源

来源: https://github.com/moshowgame/ra2yuri

## 提取内容

### ✅ INI 规则文件

| 文件 | 大小 | 说明 |
|------|------|------|
| `rules.ini` | 518 KB | 原版红警2规则 |
| `rulesmd.ini` | 712 KB | 尤里的复仇原版规则 |
| `rulesmd - 光棱科技.ini` | 712 KB | MOD: 光棱科技增强 |
| `rulesmd - 苏军觉醒.ini` | 712 KB | MOD: 苏军强化版 |
| `rulesmd - 盟军觉醒.ini` | 712 KB | MOD: 盟军强化版 |

**存放位置**: `public/assets/ini/`

### 这些INI文件包含

- **单位属性**: 生命值、速度、造价、视野、武器等
- **建筑属性**: 发电量、建造成本、特殊功能等
- **武器配置**: 伤害、射速、射程、弹道等
- **弹头配置**: 对各种装甲的伤害比
- **科技树**: 前置建筑、科技等级

### 单位列表(部分)

**盟军单位**:
- E1 (美国大兵)
- ENGINEER (工程师)
- GGI (重装大兵)
- SNIPER (狙击手)
- JUMPJET (火箭飞行兵)
- GHOST (海豹部队)
- TANY (谭雅)
- SNIPE (狙击手)
- MTNK (灰熊坦克)
- TNKD (坦克杀手)
- IFV (多功能步兵车)
- FV (战斗要塞)
- MGTK (幻影坦克)
- LTNK (光棱坦克)
- MCV (基地车)

**苏军单位**:
- E2 (动员兵)
- FLAKT (防空步兵)
- TERROR (恐怖分子)
- DESO (辐射工兵)
- SHK (磁暴步兵)
- IVAN (疯狂伊文)
- YURI (尤里)
- YURIPR (尤里改)
- HTNK (犀牛坦克)
- HTK (重型坦克)
- V3 (V3火箭)
- APC (防空履带车)
- DTRUCK (自爆卡车)
- TRUCKB (武装采矿车)
- TENT (天启坦克)
- SQD (巨型乌贼)

**尤里单位**:
- INIT (尤里新兵)
- SLAV (奴隶矿工)
- YURIX (尤里X)
- BRUTE (狂兽人)
- VLADIMIR (精神控制车)
- DBOAT (雷鸣潜艇)

### 建筑列表(部分)

**盟军建筑**:
- GAPOWR (发电厂)
- GAPILE (兵营)
- GAREFN (矿厂)
- GAWEAP (战车工厂)
- GAHPAD (停机坪)
- GARADR (雷达)
- GATECH (作战实验室)
- GAWALL (围墙)
- GAPGATE (闸门)
- GAGAP (裂缝产生器)
- GAAIRC (空指部)
- GACNST (建造厂)

**苏军建筑**:
- NAPOWR (发电厂)
- NAHAND (兵营)
- NAREFN (矿厂)
- NAWEAP (战车工厂)
- NARADR (雷达)
- NATECH (作战实验室)
- NAWALL (围墙)
- NAGATE (闸门)
- NAIRON (铁幕装置)
- NAMISL (核弹发射井)
- NACNST (建造厂)

**尤里建筑**:
- YAPOWR (生化反应炉)
- YABRCK (兵营)
- YACOM (部队回收站)
- YAWEAP (战车工厂)
- YATECH (作战实验室)
- YAGG ( Grinder - 粉碎回收机)
- YAPSYT (心灵控制塔)
- YAGNTC (基因突变器)
- YAPPET (心灵控制器)

### 武器列表(部分)

- M60 (M60机枪)
- M1Carbine (M1卡宾枪)
- Para (伞兵武器)
- Shotgun (霰弹枪)
- Maverick (小牛导弹)
- Missile (防空导弹)
- HoverMissile (海蝎导弹)
- Stinger (刺针导弹)
- Hornet (大黄蜂导弹)
- Harpoon (鱼叉导弹)
- Patriot (爱国者导弹)
- CruiserMissile (巡洋舰导弹)
- AssaultCannon (突击炮)
- BlackHawkCannon (黑鹰机炮)
- MechRailgun (机械轨道炮)
- PrismShot (光棱武器)
- GrandCannonWeapon (巨炮)
- AbramsTankGun (艾布拉姆斯主炮)
- 120mm (120mm炮)
- 105mm (105mm炮)
- 90mm (90mm炮)
- 2Inch (2英寸炮)
- TeslaBolt (磁暴线圈)
- ElectricBolt (磁能武器)
- IvanBomber (伊文炸弹)
- CrazyIvanBomber (疯狂伊文炸弹)
- FireballLauncher (火球发射器)
- FlakTrackGun (防空履带车武器)
- FlakWeapon (防空武器)
- V3Rocket (V3火箭)
- DredLauncher (无畏舰导弹)
- SubTorpedo (潜艇鱼雷)
- SquidGrab (乌贼抓取)
- SuicideBomb (自杀炸弹)
- TankDestroyerGun (坦克杀手炮)
- MirageGun (幻影坦克炮)
- TankCannon (坦克炮)
- Sniper (狙击步枪)
- ChronoBeam (超时空光束)
- IronCurtain (铁幕)

## 使用方法

### 1. 加载规则

```typescript
import { RulesLoader } from './engine/gameRes/RulesLoader'
import { ResourceManager } from './engine/gameRes/ResourceManager'

const resourceManager = new ResourceManager()
// ... 导入INI文件 ...

const rulesLoader = new RulesLoader(resourceManager)
rulesLoader.loadAll('rulesmd.ini')

const rules = rulesLoader.getRules()
console.log(`加载了 ${rules.units.size} 个单位`)
```

### 2. 查询单位属性

```typescript
const grizzlyTank = rulesLoader.getUnit('MTNK')
console.log(grizzlyTank)
// {
//   id: 'MTNK',
//   name: 'Name:GrizzlyTank',
//   strength: 300,
//   speed: 7,
//   cost: 700,
//   primary: '105mm',
//   armor: 'heavy',
//   ...
// }
```

### 3. 查询建筑属性

```typescript
const powerPlant = rulesLoader.getBuilding('GAPOWR')
console.log(powerPlant.power) // -100 (耗电100)
```

### 4. 查询武器属性

```typescript
const weapon = rulesLoader.getWeapon('105mm')
console.log(weapon.damage) // 65
console.log(weapon.range)  // 5
```

## MOD切换

可以通过加载不同的INI文件来切换游戏规则:

```typescript
// 原版
rulesLoader.loadAll('rules.ini')

// 尤里的复仇
rulesLoader.loadAll('rulesmd.ini')

// 光棱科技MOD
rulesLoader.loadAll('rulesmd - 光棱科技.ini')
```

## 注意事项

1. **版权**: 这些INI文件来自社区MOD项目，仅供学习研究
2. **完整性**: 实际游戏中还有其他配置文件(art.ini, sound.ini等)
3. **图像资源**: INI文件只包含规则，不包含单位图像(SHP文件)

## 参考

- 原始仓库: https://github.com/moshowgame/ra2yuri
- 作者: Moshow (https://zhengkai.blog.csdn.net/)
- 包含的游戏版本下载链接(阿里云盘/百度网盘)
