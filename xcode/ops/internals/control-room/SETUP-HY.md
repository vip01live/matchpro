# MatchPro Control Center — կարգավորման ուղեցույց

Ադմին-պանելի հասցեն է՝
`/xcode/ops/internals/control-room/`

## Մուտք

Ստատիկ GitHub Pages/Vercel էջում իրական գաղտնի գաղտնաբառը անվտանգ պահել հնարավոր չէ։ Դրա համար պանելը ստուգում է GitHub-ի token-ը և թույլ է տալիս փոփոխություն կատարել միայն այն դեպքում, երբ token-ի հաշիվը ունի `vip01live/matchpro` ռեպոզիտորի Contents write իրավունքը։

1. Մուտք գործեք GitHub-ի ձեր սեփական հաշիվ։
2. Բացեք [Fine-grained Personal Access Tokens](https://github.com/settings/personal-access-tokens/new) բաժինը և ստեղծեք token։
3. Resource owner՝ `vip01live`, repository access՝ միայն `matchpro`։
4. Repository permissions՝ `Contents: Read and write`։ Metadata read access-ը պետք է մնա միացված։
5. Պանելի մուտքի էջում լրացրեք GitHub օգտանունը և token-ը։ Token-ը չի պահպանվում `localStorage`-ում և չի գրվում ռեպոզիտորիայի ֆայլերում։

**Մի ուղարկեք token-ը որևէ մեկին և մի տեղադրեք այն source code-ում։** Եթե token-ը կասկածելիորեն բացահայտվել է, չեղարկեք այն GitHub Settings-ից։

## Ինչ է կառավարում պանելը

- ավելացնում է ալիք՝ երեք լեզվով անվանումով, SEO վերնագրով, նկարագրությամբ, բանալի բառերով, լոգոյով և iframe/embed հասցեով,
- խմբագրում կամ հեռացնում է առկա ալիքները,
- թարմացնում է `main/js/channels.js`, հիմնական և `app/` ալիքի էջերը,
- նույն commit-ով թարմացնում է `sitemap.xml`-ը,
- դրանից հետո GitHub Actions-ը հրապարակում է փոփոխությունը։

Sitemap-ի հիմնական հասցեն վերցվում է այն կայքի origin-ից, որի վրա բացվել է կառավարման վահանակը։ Նվագարկչի դաշտում նշեք iframe/embed URL. միայն `.m3u8` հասցեն բոլոր դեպքերում ինքնուրույն նվագարկիչ չէ։
