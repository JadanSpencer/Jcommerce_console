// src/i18n.js
// Interface language. The app is written in English; this turns the fixed
// interface text (navigation, headings, labels, buttons, tiles) into the
// chosen language as it appears on screen. Anything you typed yourself, and
// full sentences worked out from your data, stay as they are.
//
// One row per phrase: English | German | Japanese | Mandarin | Spanish | French

export const LANGS = [
  { id: 'en', name: 'English',  locale: 'en-US' },
  { id: 'de', name: 'Deutsch',  locale: 'de-DE' },
  { id: 'ja', name: '日本語',    locale: 'ja-JP' },
  { id: 'zh', name: '中文',      locale: 'zh-CN' },
  { id: 'es', name: 'Español',  locale: 'es-ES' },
  { id: 'fr', name: 'Français', locale: 'fr-FR' },
];
const ORDER = ['de', 'ja', 'zh', 'es', 'fr'];

const ROWS = `
Home|Start|ホーム|首页|Inicio|Accueil
Pipeline|Pipeline|案件|销售管道|Embudo|Pipeline
Habits|Gewohnheiten|習慣|习惯|Hábitos|Habitudes
Tasks|Aufgaben|タスク|任务|Tareas|Tâches
Focus|Fokus|集中|专注|Enfoque|Focus
Studies|Studium|学業|学业|Estudios|Études
Schedule|Zeitplan|予定|日程|Agenda|Agenda
Finance|Finanzen|財務|财务|Finanzas|Finances
Goals|Ziele|目標|目标|Metas|Objectifs
Clients|Kunden|顧客|客户|Clientes|Clients
Ventures|Unternehmen|事業|事业|Negocios|Entreprises
Founder Console|Gründerkonsole|創業者コンソール|创始人控制台|Consola del fundador|Console du fondateur
Minimise|Einklappen|最小化|收起|Minimizar|Réduire
Back up data|Daten sichern|データをバックアップ|备份数据|Respaldar datos|Sauvegarder
Log or find anything|Erfassen oder suchen|記録・検索|记录或查找|Registrar o buscar|Saisir ou chercher
Save|Speichern|保存|保存|Guardar|Enregistrer
Cancel|Abbrechen|キャンセル|取消|Cancelar|Annuler
Delete|Löschen|削除|删除|Eliminar|Supprimer
Edit|Bearbeiten|編集|编辑|Editar|Modifier
Remove|Entfernen|取り除く|移除|Quitar|Retirer
Open|Öffnen|開く|打开|Abrir|Ouvrir
Open ↗|Öffnen ↗|開く ↗|打开 ↗|Abrir ↗|Ouvrir ↗
Logs ↗|Protokolle ↗|ログ ↗|日志 ↗|Registros ↗|Journaux ↗
Open ›|Öffnen ›|開く ›|打开 ›|Abrir ›|Ouvrir ›
Approve|Genehmigen|承認|批准|Aprobar|Approuver
Reject|Ablehnen|却下|拒绝|Rechazar|Refuser
Reject all|Alle ablehnen|すべて却下|全部拒绝|Rechazar todo|Tout refuser
↻ Refresh|↻ Aktualisieren|↻ 更新|↻ 刷新|↻ Actualizar|↻ Actualiser
Stop|Stopp|停止|停止|Detener|Arrêter
Clear|Leeren|クリア|清除|Limpiar|Effacer
Try again|Erneut versuchen|もう一度試す|重试|Reintentar|Réessayer
Reload the console|Konsole neu laden|コンソールを再読み込み|重新加载控制台|Recargar la consola|Recharger la console
Open folder|Ordner öffnen|フォルダを開く|打开文件夹|Abrir carpeta|Ouvrir le dossier
Log a bill|Rechnung erfassen|請求を記録|记录账单|Registrar factura|Saisir une facture
Do today|Heute erledigen|今日やる|今天做|Hacer hoy|Faire aujourd'hui
Give up|Aufgeben|諦める|放弃|Abandonar|Abandonner
Archive|Archivieren|アーカイブ|归档|Archivar|Archiver
Unlink|Trennen|リンク解除|取消关联|Desvincular|Dissocier
Carry all|Alle übertragen|すべて繰り越す|全部顺延|Trasladar todo|Tout reporter
Carry to today|Auf heute übertragen|今日に繰り越す|顺延到今天|Pasar a hoy|Reporter à aujourd'hui
‹ Prev|‹ Zurück|‹ 前へ|‹ 上一页|‹ Anterior|‹ Préc.
Next ›|Weiter ›|次へ ›|下一页 ›|Siguiente ›|Suiv. ›
Status|Status|状態|状态|Estado|Statut
Notes|Notizen|メモ|备注|Notas|Notes
Note|Notiz|メモ|备注|Nota|Note
Note (optional)|Notiz (optional)|メモ（任意）|备注（可选）|Nota (opcional)|Note (facultatif)
Date|Datum|日付|日期|Fecha|Date
Name|Name|名前|名称|Nombre|Nom
Type|Typ|種類|类型|Tipo|Type
Location|Ort|場所|地点|Ubicación|Lieu
Country|Land|国|国家|País|Pays
Website|Website|ウェブサイト|网站|Sitio web|Site web
Email|E-Mail|メール|邮箱|Correo|E-mail
Phone|Telefon|電話|电话|Teléfono|Téléphone
Password|Passwort|パスワード|密码|Contraseña|Mot de passe
Forgot password|Passwort vergessen|パスワードを忘れた|忘记密码|Olvidé mi contraseña|Mot de passe oublié
Category|Kategorie|カテゴリ|类别|Categoría|Catégorie
Priority|Priorität|優先度|优先级|Prioridad|Priorité
High|Hoch|高|高|Alta|Haute
Medium|Mittel|中|中|Media|Moyenne
Low|Niedrig|低|低|Baja|Basse
Small|Klein|小|小|Pequeña|Petite
Large|Groß|大|大|Grande|Grande
Today|Heute|今日|今天|Hoy|Aujourd'hui
Yesterday|Gestern|昨日|昨天|Ayer|Hier
This month|Dieser Monat|今月|本月|Este mes|Ce mois-ci
This week|Diese Woche|今週|本周|Esta semana|Cette semaine
Week|Woche|週|周|Semana|Semaine
Day|Tag|日|日|Día|Jour
Now|Jetzt|今|现在|Ahora|Maintenant
All|Alle|すべて|全部|Todo|Tout
None|Keine|なし|无|Ninguno|Aucun
Total|Gesamt|合計|合计|Total|Total
Work|Arbeit|仕事|工作|Trabajo|Travail
Personal|Privat|個人|个人|Personal|Personnel
Together|Zusammen|合計|合计|Conjunto|Ensemble
Active|Aktiv|進行中|进行中|Activo|Actif
Pending|Ausstehend|保留中|待处理|Pendiente|En attente
Approved|Genehmigt|承認済み|已批准|Aprobado|Approuvé
Executed|Ausgeführt|実行済み|已执行|Ejecutado|Exécuté
Missed|Verpasst|未達|错过|Perdido|Manqué
Done today|Heute erledigt|今日完了|今日完成|Hecho hoy|Fait aujourd'hui
Overview|Übersicht|概要|概览|Resumen|Aperçu
Services|Dienste|サービス|服务|Servicios|Services
Launch|Start|ローンチ|上线|Lanzamiento|Lancement
Money|Geld|お金|资金|Dinero|Argent
Keys|Schlüssel|キー|密钥|Claves|Clés
Terminal|Terminal|ターミナル|终端|Terminal|Terminal
Docs|Doku|ドキュメント|文档|Docs|Docs
People & links|Personen & Links|人とリンク|人员与链接|Personas y enlaces|Personnes et liens
Queue|Warteschlange|キュー|队列|Cola|File
Log|Protokoll|ログ|日志|Registro|Journal
Research|Recherche|リサーチ|研究|Investigación|Recherche
Budgets|Budgets|予算|预算|Presupuestos|Budgets
Forecast|Prognose|予測|预测|Pronóstico|Prévision
Invest|Investieren|投資|投资|Invertir|Investir
Income|Einnahmen|収入|收入|Ingresos|Revenus
Expenses|Ausgaben|支出|支出|Gastos|Dépenses
Net|Netto|純額|净额|Neto|Net
Cash on hand|Bargeld verfügbar|手元資金|手头现金|Efectivo disponible|Trésorerie
Owed to you|Dir geschuldet|未回収金|别人欠你|Te deben|On vous doit
You owe|Du schuldest|借入金|你欠款|Debes|Vous devez
Runway|Reichweite|資金余力|资金可撑|Margen|Autonomie
Transaction|Buchung|取引|交易|Movimiento|Transaction
Transactions|Buchungen|取引|交易|Movimientos|Transactions
Projected|Prognose|見込み|预计|Proyectado|Prévu
Actual|Ist|実績|实际|Real|Réel
Required pace|Nötiges Tempo|必要ペース|所需进度|Ritmo necesario|Rythme requis
Where the money went|Wohin das Geld ging|お金の行き先|钱花在哪里|A dónde fue el dinero|Où est parti l'argent
Where you really stand|Wo du wirklich stehst|本当の現在地|你的真实状况|Tu situación real|Votre situation réelle
If it all settled today|Wenn heute alles beglichen wäre|今日すべて清算したら|如果今天全部结清|Si todo se saldara hoy|Si tout était réglé aujourd'hui
Money in|Geld rein|入金|收入|Entrada|Entrée
Money out|Geld raus|出金|支出|Salida|Sortie
Whose money is this?|Wessen Geld ist das?|誰のお金？|这是谁的钱？|¿De quién es este dinero?|À qui est cet argent ?
Budget|Budget|予算|预算|Presupuesto|Budget
Spent|Ausgegeben|支出済み|已花费|Gastado|Dépensé
Kept per J$1 earned|Behalten je verdientem J$1|J$1あたりの手残り|每赚J$1留下|Conservado por J$1 ganado|Gardé par J$1 gagné
Delete transaction|Buchung löschen|取引を削除|删除交易|Eliminar movimiento|Supprimer la transaction
Log a transaction|Buchung erfassen|取引を記録|记录交易|Registrar movimiento|Saisir une transaction
I owe someone|Ich schulde jemandem|誰かに借りがある|我欠别人|Le debo a alguien|Je dois à quelqu'un
Someone owes me|Jemand schuldet mir|誰かに貸しがある|别人欠我|Alguien me debe|Quelqu'un me doit
I owe them|Ich schulde ihnen|自分が借りている|我欠对方|Yo les debo|Je leur dois
They owe me|Sie schulden mir|相手が借りている|对方欠我|Me deben|Ils me doivent
Work in|Arbeit rein|仕事の入金|工作收入|Entrada de trabajo|Entrée travail
Personal in|Privat rein|個人の入金|个人收入|Entrada personal|Entrée perso
Work out|Arbeit raus|仕事の出金|工作支出|Salida de trabajo|Sortie travail
Personal out|Privat raus|個人の出金|个人支出|Salida personal|Sortie perso
Net together|Netto gesamt|純額合計|合计净额|Neto conjunto|Net global
Next moves|Nächste Schritte|次の一手|下一步|Próximos pasos|Prochaines actions
Today's schedule|Heutiger Zeitplan|今日の予定|今日日程|Agenda de hoy|Agenda du jour
Safe to spend|Frei verfügbar|使ってよい額|可安全支出|Disponible para gastar|Dépensable sans risque
habits|Gewohnheiten|習慣|习惯|hábitos|habitudes
tasks|Aufgaben|タスク|任务|tareas|tâches
focused|fokussiert|集中|专注|enfocado|concentré
urgent|dringend|緊急|紧急|urgente|urgent
Tide Log|Tagesprotokoll|日誌|每日记录|Diario|Journal du jour
Nothing scheduled. Protect the time.|Nichts geplant. Schütze die Zeit.|予定なし。この時間を守ろう。|没有安排。守住这段时间。|Nada programado. Protege ese tiempo.|Rien de prévu. Protégez ce temps.
No habits yet.|Noch keine Gewohnheiten.|習慣はまだありません。|还没有习惯。|Aún no hay hábitos.|Aucune habitude pour l'instant.
No timers running.|Kein Timer läuft.|動作中のタイマーなし。|没有运行中的计时器。|No hay temporizadores activos.|Aucun minuteur en cours.
Set one|Einen setzen|設定する|设置一个|Crear uno|En créer un
Add one|Hinzufügen|追加する|添加一个|Añadir uno|En ajouter un
Daily minimum|Tagesminimum|1日の最低数|每日最低|Mínimo diario|Minimum quotidien
Finish at least|Mindestens erledigen|最低完了数|至少完成|Termina al menos|Terminer au moins
Nothing left behind.|Nichts liegen geblieben.|やり残しなし。|没有遗留。|Nada pendiente.|Rien en retard.
carried forward|übertragen|繰り越し|已顺延|trasladada|reportée
Longest streak|Längste Serie|最長連続|最长连续|Racha más larga|Plus longue série
Last 30 days|Letzte 30 Tage|過去30日|最近30天|Últimos 30 días|30 derniers jours
Add a habit|Gewohnheit hinzufügen|習慣を追加|添加习惯|Añadir hábito|Ajouter une habitude
Timer|Timer|タイマー|计时器|Temporizador|Minuteur
XP from focus|XP aus Fokus|集中のXP|专注所得XP|XP por enfoque|XP du focus
Create a timer|Timer erstellen|タイマーを作成|创建计时器|Crear temporizador|Créer un minuteur
to go|verbleibend|残り|剩余|restante|restant
since Monday|seit Montag|月曜から|自周一起|desde el lunes|depuis lundi
Course|Kurs|科目|课程|Curso|Cours
Topics covered|Behandelte Themen|履修済みトピック|已学主题|Temas cubiertos|Sujets couverts
Studied this week|Diese Woche gelernt|今週の学習|本周学习|Estudiado esta semana|Étudié cette semaine
Next exam|Nächste Prüfung|次の試験|下次考试|Próximo examen|Prochain examen
Behind pace|Im Rückstand|遅れ|落后进度|Con retraso|En retard
Syllabus|Lehrplan|シラバス|课程大纲|Temario|Programme
Paste outline|Gliederung einfügen|概要を貼り付け|粘贴大纲|Pegar esquema|Coller le plan
No courses yet.|Noch keine Kurse.|科目はまだありません。|还没有课程。|Aún no hay cursos.|Aucun cours pour l'instant.
Delete course|Kurs löschen|科目を削除|删除课程|Eliminar curso|Supprimer le cours
This week's balance|Balance dieser Woche|今週のバランス|本周平衡|Equilibrio de la semana|Équilibre de la semaine
Set hours|Stunden festlegen|時間を設定|设置小时|Fijar horas|Définir les heures
Event|Termin|予定|事件|Evento|Événement
Add an event|Termin hinzufügen|予定を追加|添加事件|Añadir evento|Ajouter un événement
A free day.|Ein freier Tag.|予定のない日。|空闲的一天。|Un día libre.|Une journée libre.
Nothing scheduled.|Nichts geplant.|予定なし。|没有安排。|Nada programado.|Rien de prévu.
Goal|Ziel|目標|目标|Meta|Objectif
Reached|Erreicht|達成|已达成|Alcanzada|Atteint
Deadline|Frist|期限|截止日期|Fecha límite|Échéance
Mark as done|Als erledigt markieren|完了にする|标记为完成|Marcar como hecho|Marquer comme fait
Add step|Schritt hinzufügen|ステップを追加|添加步骤|Añadir paso|Ajouter une étape
Milestone|Meilenstein|マイルストーン|里程碑|Hito|Jalon
Steps|Schritte|ステップ|步骤|Pasos|Étapes
Revenue|Umsatz|売上|营收|Ingresos|Chiffre d'affaires
Profit|Gewinn|利益|利润|Beneficio|Bénéfice
Savings|Ersparnisse|貯蓄|储蓄|Ahorros|Épargne
Client|Kunde|顧客|客户|Cliente|Client
Active clients|Aktive Kunden|稼働中の顧客|活跃客户|Clientes activos|Clients actifs
Lifetime revenue|Gesamtumsatz|累計売上|累计营收|Ingresos totales|Revenu cumulé
Retainer|Pauschale|月額契約|月费|Iguala|Forfait mensuel
Profile|Profil|プロフィール|资料|Perfil|Profil
Payments|Zahlungen|支払い|付款|Pagos|Paiements
Payment|Zahlung|支払い|付款|Pago|Paiement
Product|Produkt|製品|产品|Producto|Produit
Platforms|Plattformen|プラットフォーム|平台|Plataformas|Plateformes
Credentials|Zugangsdaten|認証情報|凭据|Credenciales|Identifiants
Venture|Unternehmen|事業|事业|Negocio|Entreprise
Needs attention|Braucht Aufmerksamkeit|要対応|需要关注|Requiere atención|À traiter
Running cost|Laufende Kosten|運営コスト|运营成本|Coste operativo|Coût de fonctionnement
Next move|Nächster Schritt|次の一手|下一步|Próximo paso|Prochaine action
Checked today|Heute geprüft|本日確認済み|今日已检查|Revisado hoy|Vérifié aujourd'hui
Stage|Phase|段階|阶段|Etapa|Étape
Planned|Geplant|計画|计划|Planificado|Prévu
Paid so far|Bisher bezahlt|これまでの支払い|已支付|Pagado hasta ahora|Payé à ce jour
Paid this month|Diesen Monat bezahlt|今月の支払い|本月已付|Pagado este mes|Payé ce mois-ci
Service|Dienst|サービス|服务|Servicio|Service
The road|Der Weg|道のり|路线|El camino|La route
Open moves|Offene Schritte|未完了の一手|未完成步骤|Pasos abiertos|Actions ouvertes
At a glance|Auf einen Blick|ひと目で|一览|De un vistazo|En un coup d'œil
Started|Gestartet|開始|开始|Iniciado|Démarré
People|Personen|人|人员|Personas|Personnes
Time put in|Investierte Zeit|投入時間|投入时间|Tiempo invertido|Temps investi
Project folder|Projektordner|プロジェクトフォルダ|项目文件夹|Carpeta del proyecto|Dossier du projet
Latest commits|Letzte Commits|最新コミット|最近提交|Últimos commits|Derniers commits
Branch|Branch|ブランチ|分支|Rama|Branche
Orders|Bestellungen|注文|订单|Pedidos|Commandes
Delivered|Geliefert|配達済み|已送达|Entregado|Livré
Cancelled|Storniert|キャンセル|已取消|Cancelado|Annulé
Completion|Abschlussquote|完了率|完成率|Cumplimiento|Taux d'achèvement
Lowest|Niedrigster|最低|最低|Mínimo|Minimum
Highest|Höchster|最高|最高|Máximo|Maximum
Soft launch|Soft-Launch|ソフトローンチ|试运营|Lanzamiento suave|Lancement discret
Public app launch|Öffentlicher App-Start|アプリ一般公開|应用公开上线|Lanzamiento público de la app|Lancement public de l'app
Step|Schritt|ステップ|步骤|Paso|Étape
Link|Link|リンク|链接|Enlace|Lien
Person|Person|人|人员|Persona|Personne
Move|Schritt|一手|步骤|Paso|Action
Across everything|Über alles hinweg|全体|全部事项|En conjunto|Sur l'ensemble
Next 14 days|Nächste 14 Tage|今後14日|未来14天|Próximos 14 días|14 prochains jours
Earned so far|Bisher verdient|これまでの収益|已赚取|Ganado hasta ahora|Gagné à ce jour
Spent so far|Bisher ausgegeben|これまでの支出|已花费|Gastado hasta ahora|Dépensé à ce jour
What it has made you|Was es dir gebracht hat|手元に残った額|为你赚了多少|Lo que te ha dejado|Ce que cela vous a rapporté
I've read today's check|Heutigen Check gelesen|今日のチェックを読んだ|我已阅读今日检查|He leído la revisión de hoy|J'ai lu le contrôle du jour
Add to log|Zum Protokoll hinzufügen|ログに追加|添加到日志|Añadir al registro|Ajouter au journal
Nothing logged yet.|Noch nichts erfasst.|記録はまだありません。|还没有记录。|Aún no hay registros.|Rien d'enregistré pour l'instant.
Idea|Idee|構想|构想|Idea|Idée
Building|Im Aufbau|準備中|筹备中|En construcción|En construction
Live|Live|稼働中|运行中|En vivo|En service
Paused|Pausiert|休止|暂停|En pausa|En pause
Thriving|Blühend|絶好調|蒸蒸日上|Prosperando|Florissant
Good|Gut|良好|良好|Bien|Bon
Watch Out|Vorsicht|要注意|注意|Cuidado|Attention
Struggling|Schwierig|苦戦中|吃力|Con dificultades|En difficulté
Danger|Gefahr|危険|危险|Peligro|Danger
LEVEL UP|LEVEL AUFSTIEG|レベルアップ|升级|SUBES DE NIVEL|NIVEAU SUPÉRIEUR
Click to continue|Klicken zum Fortfahren|クリックして続ける|点击继续|Haz clic para continuar|Cliquez pour continuer
This section hit a problem|In diesem Bereich ist ein Problem aufgetreten|このセクションで問題が発生しました|此部分出现问题|Esta sección tuvo un problema|Cette section a rencontré un problème
Your data is safe. Only this page stopped.|Deine Daten sind sicher. Nur diese Seite hat angehalten.|データは安全です。このページだけが止まりました。|你的数据是安全的。只有此页面停止了。|Tus datos están a salvo. Solo se detuvo esta página.|Vos données sont en sécurité. Seule cette page s'est arrêtée.
Good morning|Guten Morgen|おはよう|早上好|Buenos días|Bonjour
Good afternoon|Guten Tag|こんにちは|下午好|Buenas tardes|Bon après-midi
Good evening|Guten Abend|こんばんは|晚上好|Buenas noches|Bonsoir
Level|Level|レベル|等级|Nivel|Niveau
Apprentice|Lehrling||学徒|Aprendiz|Apprenti
Keeping at it is power.|Dranbleiben ist Stärke.|継続は力なり。|坚持就是力量。|La constancia es poder.|La persévérance fait la force.
Handle the red items first. Everything else can wait.|Erledige zuerst die roten Punkte. Alles andere kann warten.|赤い項目を先に片付けよう。他は後でいい。|先处理红色事项，其余可以等。|Atiende primero lo rojo. Lo demás puede esperar.|Traitez d'abord les éléments rouges. Le reste peut attendre.
No tasks planned today|Heute keine Aufgaben geplant|今日のタスクは未計画|今天没有计划任务|Sin tareas planificadas hoy|Aucune tâche prévue aujourd'hui
money|Geld|のお金|资金|dinero|argent
Nothing|Nichts|なし|无|Nada|Rien
No income coming in. Every dollar spent is borrowed from the future.|Keine Einnahmen. Jeder ausgegebene Dollar ist von der Zukunft geliehen.|収入なし。使う1ドルは未来からの借金。|没有收入。花的每一块钱都是向未来借的。|No entra dinero. Cada dólar gastado se le pide prestado al futuro.|Aucun revenu. Chaque dollar dépensé est emprunté à l'avenir.
No backup of your data has been saved from this Mac yet.|Von diesem Mac wurde noch keine Datensicherung gespeichert.|このMacからのバックアップはまだありません。|这台Mac尚未保存过数据备份。|Aún no se ha guardado ninguna copia de tus datos desde este Mac.|Aucune sauvegarde de vos données n'a encore été faite depuis ce Mac.
Back up now|Jetzt sichern|今すぐバックアップ|立即备份|Respaldar ahora|Sauvegarder maintenant
Habits ·|Gewohnheiten ·|習慣 ·|习惯 ·|Hábitos ·|Habitudes ·
Tasks ·|Aufgaben ·|タスク ·|任务 ·|Tareas ·|Tâches ·
What came in with today's tide?|Was hat die heutige Flut gebracht?|今日の潮は何を運んできた？|今天的潮水带来了什么？|¿Qué trajo la marea de hoy?|Qu'a apporté la marée du jour ?
XP ledger · every section pays in and takes out|XP-Buch · jeder Bereich zahlt ein und zieht ab|XP台帳 · すべてのセクションが加点・減点する|XP账本 · 每个板块都会加分和扣分|Libro de XP · cada sección suma y resta|Registre XP · chaque section ajoute et retire
earned ·|verdient ·|獲得 ·|获得 ·|ganado ·|gagné ·
lost|verloren|損失|失去|perdido|perdu
School|Schule|学校|学校|Escuela|École
Life|Leben|生活|生活|Vida|Vie
Business|Geschäft|ビジネス|生意|Negocio|Affaires
Health|Gesundheit|健康|健康|Salud|Santé
Business velocity|Geschäftstempo|事業の勢い|业务速度|Ritmo del negocio|Rythme de l'activité
Revenue Velocity|Umsatztempo|売上の勢い|营收速度|Ritmo de ingresos|Rythme du chiffre d'affaires
Lead Velocity|Lead-Tempo|リードの勢い|线索速度|Ritmo de prospectos|Rythme des prospects
Habit Consistency|Gewohnheitstreue|習慣の継続度|习惯坚持度|Constancia de hábitos|Régularité des habitudes
Habit consistency ·|Gewohnheitstreue ·|習慣の継続度 ·|习惯坚持度 ·|Constancia de hábitos ·|Régularité des habitudes ·
new this week|neu diese Woche|今週の新規|本周新增|nuevos esta semana|nouveaux cette semaine
weeks|Wochen|週間|周|semanas|semaines
months|Monate|か月|个月|meses|mois
Less|Weniger|少|少|Menos|Moins
More|Mehr|多|多|Más|Plus
Lead|Lead|リード|线索|Prospecto|Prospect
Open pipeline|Offene Pipeline|進行中の案件|进行中的管道|Embudo abierto|Pipeline ouvert
open lead|offener Lead|進行中のリード|进行中线索|prospecto abierto|prospect ouvert
open leads|offene Leads|進行中のリード|进行中线索|prospectos abiertos|prospects ouverts
Win rate|Abschlussquote|成約率|成交率|Tasa de cierre|Taux de réussite
won ·|gewonnen ·|成約 ·|成交 ·|ganados ·|gagnés ·
Follow-ups due|Fällige Nachfassaktionen|要フォローアップ|待跟进|Seguimientos pendientes|Relances à faire
all caught up|alles erledigt|すべて対応済み|全部跟上|todo al día|tout est à jour
No next step|Kein nächster Schritt|次の一手なし|没有下一步|Sin próximo paso|Sans prochaine étape
leads without a date|Leads ohne Datum|日付のないリード|没有日期的线索|prospectos sin fecha|prospects sans date
No leads match your filters.|Keine Leads passen zu deinen Filtern.|条件に合うリードはありません。|没有符合筛选条件的线索。|Ningún prospecto coincide con tus filtros.|Aucun prospect ne correspond à vos filtres.
Tracking|Aktiv|追跡中|追踪中|En seguimiento|Suivies
Archived|Archiviert|アーカイブ済み|已归档|Archivados|Archivées
Habit|Gewohnheit|習慣|习惯|Hábito|Habitude
XP today|XP heute|今日のXP|今日XP|XP de hoy|XP du jour
still alive|noch aktiv|継続中|仍在持续|sigue viva|toujours en cours
of days completed|der Tage geschafft|の日を達成|的天数已完成|de los días cumplidos|des jours accomplis
Missed day costs|Ein verpasster Tag kostet|未達の日のペナルティ|错过一天的代价|Un día perdido cuesta|Un jour manqué coûte
per habit, judged next morning|pro Gewohnheit, Wertung am nächsten Morgen|習慣ごと・翌朝に判定|每个习惯，次日早晨结算|por hábito, se juzga a la mañana siguiente|par habitude, jugé le lendemain matin
No habits yet. Start with one you can do even on your worst day.|Noch keine Gewohnheiten. Beginne mit einer, die du selbst an deinem schlechtesten Tag schaffst.|習慣はまだありません。最悪の日でもできるものから始めよう。|还没有习惯。从最糟糕的一天也能做到的那个开始。|Aún no hay hábitos. Empieza con uno que puedas hacer incluso en tu peor día.|Aucune habitude. Commencez par une que vous pouvez tenir même dans votre pire journée.
Nothing archived.|Nichts archiviert.|アーカイブなし。|没有归档。|Nada archivado.|Rien d'archivé.
nothing planned|nichts geplant|計画なし|没有计划|nada planificado|rien de prévu
Nothing planned. Five tasks minimum, or it costs you tomorrow.|Nichts geplant. Mindestens fünf Aufgaben, sonst kostet es dich morgen.|計画なし。最低5タスク、さもないと明日減点。|没有计划。至少五项任务，否则明天扣分。|Nada planificado. Mínimo cinco tareas, o te costará mañana.|Rien de prévu. Cinq tâches minimum, sinon cela vous coûtera demain.
counts toward your level|zählt für dein Level|レベルに加算|计入你的等级|cuenta para tu nivel|compte pour votre niveau
completed|abgeschlossen|完了|已完成|completados|terminés
No active timers. Set a target and a deadline, then fill the bottle.|Keine aktiven Timer. Setze ein Ziel und eine Frist, dann fülle das Glas.|有効なタイマーなし。目標と期限を決めて、砂時計を満たそう。|没有进行中的计时器。设定目标和期限，然后把沙漏装满。|No hay temporizadores activos. Fija un objetivo y un plazo, y llena el reloj.|Aucun minuteur actif. Fixez un objectif et une échéance, puis remplissez le sablier.
Nothing here yet.|Noch nichts hier.|まだ何もありません。|这里还没有内容。|Aún no hay nada aquí.|Rien ici pour l'instant.
Nothing here.|Nichts hier.|何もありません。|这里没有内容。|Nada aquí.|Rien ici.
still to go|noch offen|残り|还剩|por hacer|restant
on focus timers|mit Fokus-Timern|集中タイマーで|来自专注计时|en temporizadores de enfoque|sur les minuteurs
no exam dates set|keine Prüfungstermine|試験日未設定|未设置考试日期|sin fechas de examen|aucune date d'examen
course|Kurs|科目|门课程|curso|cours
courses|Kurse|科目|门课程|cursos|cours
Add a course, then paste in its syllabus. Tick topics off as you actually cover them.|Füge einen Kurs hinzu und dann seinen Lehrplan ein. Hake Themen ab, sobald du sie wirklich behandelt hast.|科目を追加してシラバスを貼り付けよう。実際に学んだトピックにチェックを。|添加课程，然后粘贴大纲。真正学完的主题再打勾。|Añade un curso y pega su temario. Marca los temas cuando de verdad los cubras.|Ajoutez un cours, puis collez son programme. Cochez les sujets à mesure que vous les couvrez vraiment.
Mon|Mo|月|周一|Lun|Lun
Tue|Di|火|周二|Mar|Mar
Wed|Mi|水|周三|Mié|Mer
Thu|Do|木|周四|Jue|Jeu
Fri|Fr|金|周五|Vie|Ven
Sat|Sa|土|周六|Sáb|Sam
Sun|So|日|周日|Dom|Dim
Today ·|Heute ·|今日 ·|今天 ·|Hoy ·|Aujourd'hui ·
Coming up · one-time|Demnächst · einmalig|今後 · 単発|即将到来 · 一次性|Próximamente · únicos|À venir · ponctuels
No one-off events in the next two weeks.|Keine einmaligen Termine in den nächsten zwei Wochen.|今後2週間に単発の予定はありません。|未来两周没有一次性事件。|No hay eventos únicos en las próximas dos semanas.|Aucun événement ponctuel dans les deux prochaines semaines.
event|Termin|件の予定|个事件|evento|événement
events|Termine|件の予定|个事件|eventos|événements
All money|Alles Geld|すべてのお金|全部资金|Todo el dinero|Tout l'argent
Debts|Schulden|貸し借り|债务|Deudas|Dettes
Debts ›|Schulden ›|貸し借り ›|债务 ›|Deudas ›|Dettes ›
net, work and personal together|netto, Arbeit und Privat zusammen|純額・仕事と個人の合計|净额，工作与个人合计|neto, trabajo y personal juntos|net, travail et personnel réunis
in ·|rein ·|入 ·|收 ·|entra ·|entrée ·
out|raus|出|支|sale|sortie
In|Rein|入金|收入|Entra|Entrée
Out|Raus|出金|支出|Sale|Sortie
minimum|Minimum|最低|最低|mínimo|minimum
left|übrig|残り|剩余|restante|restant
Nothing logged. Money you don't record is money you can't manage.|Nichts erfasst. Geld, das du nicht aufschreibst, kannst du nicht steuern.|記録なし。記録しないお金は管理できない。|没有记录。不记账的钱就无法管理。|Nada registrado. El dinero que no anotas no lo puedes gestionar.|Rien d'enregistré. L'argent que vous ne notez pas, vous ne pouvez pas le gérer.
Stop spending. Start collecting.|Hör auf auszugeben. Fang an einzutreiben.|使うのをやめて、回収を始めよう。|停止花钱，开始收款。|Deja de gastar. Empieza a cobrar.|Arrêtez de dépenser. Commencez à encaisser.
No burn|Kein Verbrauch|消費なし|无消耗|Sin gasto|Aucune dépense
Retainers (MRR)|Pauschalen (MRR)|月額契約 (MRR)|月费 (MRR)|Igualas (MRR)|Forfaits (MRR)
/mo|/Monat|/月|/月|/mes|/mois
/day|/Tag|/日|/天|/día|/jour
new|neu|新規|新增|nuevo|nouveau
none yet|noch keine|まだなし|暂无|ninguno aún|aucun pour l'instant
to collect|einzutreiben|回収予定|待收|por cobrar|à encaisser
to pay|zu zahlen|支払予定|待付|por pagar|à payer
Work and personal ·|Arbeit und Privat ·|仕事と個人 ·|工作与个人 ·|Trabajo y personal ·|Travail et personnel ·
transaction|Buchung|件の取引|笔交易|movimiento|transaction
transactions|Buchungen|件の取引|笔交易|movimientos|transactions
Nothing spent yet this month.|Diesen Monat noch nichts ausgegeben.|今月の支出はまだありません。|本月尚无支出。|Aún no se ha gastado nada este mes.|Rien dépensé ce mois-ci pour l'instant.
Profit pace|Gewinntempo|利益ペース|利润进度|Ritmo de beneficio|Rythme du bénéfice
work profit|Arbeitsgewinn|仕事の利益|工作利润|beneficio del trabajo|bénéfice du travail
personal money, in minus out|privates Geld, rein minus raus|個人のお金・入金−出金|个人资金，收入减支出|dinero personal, entradas menos salidas|argent personnel, entrées moins sorties
Sloppy. Fix the leaks.|Schlampig. Stopfe die Lecks.|雑だ。漏れを塞ごう。|太松散了。把漏洞堵上。|Descuidado. Tapa las fugas.|Négligé. Colmatez les fuites.
Personal money this month|Privates Geld diesen Monat|今月の個人のお金|本月个人资金|Dinero personal este mes|Argent personnel ce mois-ci
open|offen|未精算|未结清|abiertas|ouvertes
people|Personen|人|人|personas|personnes
owed to you, less what you owe|dir geschuldet, abzüglich deiner Schulden|貸しから借りを引いた額|别人欠你的，减去你欠的|lo que te deben, menos lo que debes|ce qu'on vous doit, moins ce que vous devez
nothing to clear|nichts auszugleichen|精算するものなし|无需结清|nada que saldar|rien à solder
Work and personal · everything still open|Arbeit und Privat · alles noch offen|仕事と個人 · 未精算すべて|工作与个人 · 所有未结清|Trabajo y personal · todo lo que sigue abierto|Travail et personnel · tout ce qui reste ouvert
You owe ·|Du schuldest ·|借り ·|你欠 ·|Debes ·|Vous devez ·
You owe nobody. Keep it that way.|Du schuldest niemandem etwas. Lass es so.|誰にも借りなし。このままで。|你不欠任何人。保持下去。|No le debes a nadie. Sigue así.|Vous ne devez rien à personne. Continuez ainsi.
Owed to you ·|Dir geschuldet ·|貸し ·|别人欠你 ·|Te deben ·|On vous doit ·
Nobody owes you anything.|Niemand schuldet dir etwas.|誰にも貸しなし。|没有人欠你钱。|Nadie te debe nada.|Personne ne vous doit rien.
Monthly budgets ·|Monatsbudgets ·|月間予算 ·|月度预算 ·|Presupuestos mensuales ·|Budgets mensuels ·
Hosting|Hosting|ホスティング|托管|Alojamiento|Hébergement
AI API|KI-API|AI API|AI接口|API de IA|API d'IA
Tools|Werkzeuge|ツール|工具|Herramientas|Outils
Transport|Transport|交通|交通|Transporte|Transport
Food|Essen|食費|餐饮|Comida|Alimentation
Education|Bildung|教育|教育|Educación|Éducation
Bills|Rechnungen|請求|账单|Facturas|Factures
Other|Sonstiges|その他|其他|Otros|Autre
Can you afford your budgets?|Kannst du dir deine Budgets leisten?|この予算は賄える？|你的预算负担得起吗？|¿Puedes permitirte tus presupuestos?|Pouvez-vous assumer vos budgets ?
Average monthly income|Durchschnittliches Monatseinkommen|平均月収|平均月收入|Ingreso mensual medio|Revenu mensuel moyen
minimum profit|Mindestgewinn|最低利益|最低利润|beneficio mínimo|bénéfice minimum
Most you can spend|Maximal ausgebbar|使える上限|最多可花|Lo máximo que puedes gastar|Dépense maximale
Budgets total|Budgets gesamt|予算合計|预算合计|Total de presupuestos|Total des budgets
Spent this month|Diesen Monat ausgegeben|今月の支出|本月已花费|Gastado este mes|Dépensé ce mois-ci
The honest numbers|Die ehrlichen Zahlen|正直な数字|真实数字|Los números honestos|Les chiffres honnêtes
Monthly gap|Monatliche Lücke|月間の不足|每月缺口|Brecha mensual|Écart mensuel
Cash in|Geldeingang|入金|现金流入|Entrada de efectivo|Encaissements
Only signed retainers count. Deals still in negotiation don't.|Nur unterschriebene Pauschalen zählen. Laufende Verhandlungen nicht.|契約済みの月額のみ計上。交渉中は含めない。|只计入已签约的月费，谈判中的不算。|Solo cuentan las igualas firmadas. Los tratos en negociación, no.|Seuls les forfaits signés comptent. Pas les affaires en négociation.
Before you invest a dollar|Bevor du einen Dollar investierst|1ドル投資する前に|在投资一分钱之前|Antes de invertir un dólar|Avant d'investir un dollar
Free to invest|Frei zum Investieren|投資に回せる額|可用于投资|Libre para invertir|Disponible pour investir
Nothing to invest. Build three months of spending in cash first.|Nichts zu investieren. Baue zuerst drei Monatsausgaben in bar auf.|投資できる額なし。まず3か月分の支出を現金で確保。|没有可投资的钱。先存够三个月开销的现金。|Nada que invertir. Primero reúne tres meses de gastos en efectivo.|Rien à investir. Constituez d'abord trois mois de dépenses en liquide.
Ask JAXON for reinvestment advice|JAXON um Reinvestitionsrat bitten|JAXONに再投資の助言を求める|向JAXON咨询再投资建议|Pedir a JAXON consejo de reinversión|Demander conseil à JAXON pour réinvestir
Recurring revenue|Wiederkehrender Umsatz|継続収益|经常性收入|Ingresos recurrentes|Revenus récurrents
Retainers alone cover your minimum.|Die Pauschalen allein decken dein Minimum.|月額契約だけで最低ラインを賄える。|仅月费就能覆盖你的最低要求。|Las igualas por sí solas cubren tu mínimo.|Les forfaits couvrent à eux seuls votre minimum.
behind pace|im Rückstand|遅れ|落后进度|con retraso|en retard
logged after the fact|nachträglich erfasst|事後記録|事后记录|registrado después|saisi après coup
XP from goals|XP aus Zielen|目標のXP|目标所得XP|XP por metas|XP des objectifs
missed|verpasst|未達|错过|perdidas|manqués
Next deadline|Nächste Frist|次の期限|下一个期限|Próxima fecha límite|Prochaine échéance
nothing dated|nichts terminiert|日付なし|没有日期|nada con fecha|rien de daté
No active goals here. A goal can be a number, a list of steps, or one thing you get done.|Keine aktiven Ziele. Ein Ziel kann eine Zahl sein, eine Liste von Schritten oder eine Sache, die du erledigst.|有効な目標なし。目標は数字でも、手順のリストでも、やり遂げる一つのことでもいい。|这里没有进行中的目标。目标可以是一个数字、一组步骤，或一件要完成的事。|No hay metas activas. Una meta puede ser un número, una lista de pasos o una sola cosa que terminas.|Aucun objectif actif. Un objectif peut être un chiffre, une liste d'étapes ou une seule chose à accomplir.
Set a goal|Ziel setzen|目標を立てる|设定目标|Fijar una meta|Fixer un objectif
Nothing reached yet. Already done something big? Log it.|Noch nichts erreicht. Schon etwas Großes geschafft? Trag es ein.|達成はまだなし。すでに大きなことを成し遂げた？記録しよう。|尚未达成任何目标。已经做成了大事？记下来。|Aún nada alcanzado. ¿Ya lograste algo grande? Regístralo.|Rien d'atteint pour l'instant. Déjà accompli quelque chose de grand ? Notez-le.
Log a win|Erfolg eintragen|成果を記録|记录一次胜利|Registrar un logro|Noter une victoire
JAXON Intelligence|JAXON-Intelligenz|JAXONインテリジェンス|JAXON智能|Inteligencia JAXON|Intelligence JAXON
Second Brain|Zweites Gehirn|第二の脳|第二大脑|Segundo cerebro|Second cerveau
One lead search a day.|Eine Lead-Suche pro Tag.|リード検索は1日1回。|每天一次线索搜索。|Una búsqueda de prospectos al día.|Une recherche de prospects par jour.
Today:|Heute:|今日：|今天：|Hoy:|Aujourd'hui :
not run yet|noch nicht gelaufen|未実行|尚未运行|aún no ejecutada|pas encore lancée
Clear horizon|Freier Horizont|視界良好|一片清朗|Horizonte despejado|Horizon dégagé
Nothing waiting for you|Nichts wartet auf dich|対応待ちなし|没有待处理事项|Nada te espera|Rien ne vous attend
paused ·|pausiert ·|休止 ·|暂停 ·|en pausa ·|en pause ·
churned|abgewandert|解約|流失|perdidos|perdus
active clients only|nur aktive Kunden|稼働中の顧客のみ|仅活跃客户|solo clientes activos|clients actifs uniquement
all settled|alles beglichen|すべて精算済み|全部结清|todo saldado|tout est réglé
from these clients|von diesen Kunden|この顧客から|来自这些客户|de estos clientes|de ces clients
No clients yet.|Noch keine Kunden.|顧客はまだいません。|还没有客户。|Aún no hay clientes.|Aucun client pour l'instant.
Close a deal in the Pipeline, or add a client directly.|Schließe einen Deal in der Pipeline ab oder füge direkt einen Kunden hinzu.|案件で成約するか、顧客を直接追加しよう。|在销售管道中成交，或直接添加客户。|Cierra un trato en el Embudo o añade un cliente directamente.|Concluez une affaire dans le Pipeline ou ajoutez un client directement.
Parent company · registered sole trader|Muttergesellschaft · eingetragener Einzelunternehmer|親会社 · 登録済み個人事業主|母公司 · 注册个体经营者|Empresa matriz · autónomo registrado|Société mère · entrepreneur individuel enregistré
The house every venture below belongs to.|Das Haus, zu dem jedes Unternehmen darunter gehört.|下のすべての事業が属する本家。|下方每个事业所属的本家。|La casa a la que pertenece cada negocio de abajo.|La maison à laquelle appartient chaque entreprise ci-dessous.
building|im Aufbau|準備中|筹备中|en construcción|en construction
live ·|live ·|稼働中 ·|运行中 ·|en vivo ·|en service ·
across everything|über alles hinweg|全体で|全部合计|en conjunto|sur l'ensemble
a month, from the services you priced|pro Monat, aus den von dir bepreisten Diensten|月額・価格を入れたサービスより|每月，来自你已定价的服务|al mes, según los servicios con precio|par mois, d'après les services chiffrés
not checked today|heute nicht geprüft|本日未確認|今日未检查|sin revisar hoy|non vérifié aujourd'hui
No dated moves or bills coming up.|Keine terminierten Schritte oder Rechnungen in Sicht.|日付のある一手や請求は当面なし。|近期没有带日期的步骤或账单。|No hay pasos ni facturas con fecha próximos.|Aucune action ni facture datée à venir.
Code|Code|コード|代码|Código|Code
Your cut|Dein Anteil|あなたの取り分|你的分成|Tu parte|Votre part
Colour|Farbe|色|颜色|Color|Couleur
Morning Briefing|Morgenbriefing|朝のブリーフィング|晨间简报|Informe matutino|Briefing du matin
Briefing|Briefing|ブリーフィング|简报|Informe|Briefing
Filters|Filter|フィルター|筛选|Filtros|Filtres
Location / Parish|Ort / Bezirk|場所 / 教区|地点 / 教区|Ubicación / Parroquia|Lieu / Paroisse
WhatsApp Number|WhatsApp-Nummer|WhatsApp番号|WhatsApp号码|Número de WhatsApp|Numéro WhatsApp
Source|Quelle|出所|来源|Origen|Source
Business Size|Unternehmensgröße|事業規模|企业规模|Tamaño del negocio|Taille de l'entreprise
Existing Payments|Bisherige Zahlungen|既存の支払い|已有付款|Pagos existentes|Paiements existants
Start tracking again|Wieder verfolgen|追跡を再開|重新开始追踪|Volver a seguir|Reprendre le suivi
Unfinished · last 7 days|Unerledigt · letzte 7 Tage|未完了 · 過去7日|未完成 · 最近7天|Sin terminar · últimos 7 días|Inachevé · 7 derniers jours
No course|Kein Kurs|科目なし|无课程|Sin curso|Aucun cours
behind|zurück|遅れ|落后|de retraso|de retard
Time studied|Lernzeit|学習時間|学习时间|Tiempo estudiado|Temps étudié
on linked timers|mit verknüpften Timern|連携タイマーで|来自关联计时器|en temporizadores vinculados|sur les minuteurs liés
XP from this course|XP aus diesem Kurs|この科目のXP|本课程所得XP|XP de este curso|XP de ce cours
average study time|durchschnittliche Lernzeit|平均学習時間|平均学习时间|tiempo medio de estudio|temps d'étude moyen
▶ Study|▶ Lernen|▶ 学習|▶ 学习|▶ Estudiar|▶ Étudier
❚❚ Pause|❚❚ Pause|❚❚ 一時停止|❚❚ 暂停|❚❚ Pausa|❚❚ Pause
No syllabus yet.|Noch kein Lehrplan.|シラバスはまだありません。|还没有大纲。|Aún no hay temario.|Pas encore de programme.
Paste the course outline|Kursgliederung einfügen|科目概要を貼り付け|粘贴课程大纲|Pegar el esquema del curso|Coller le plan du cours
or|oder|または|或|o|ou
add units by hand|Einheiten von Hand hinzufügen|単元を手動で追加|手动添加单元|añadir unidades a mano|ajouter des unités à la main
Add to it|Ergänzen|追加する|追加|Añadir|Compléter
Replace it|Ersetzen|置き換える|替换|Reemplazar|Remplacer
Nothing to flag. Keep logging.|Nichts zu melden. Weiter erfassen.|指摘なし。記録を続けよう。|没有需要提醒的。继续记录。|Nada que señalar. Sigue registrando.|Rien à signaler. Continuez à saisir.
client|Kunde|顧客|位客户|cliente|client
clients|Kunden|顧客|位客户|clientes|clients
JAXON's assessment|JAXONs Einschätzung|JAXONの評価|JAXON的评估|Evaluación de JAXON|Évaluation de JAXON
steps done|Schritte erledigt|ステップ完了|步骤已完成|pasos hechos|étapes faites
Update progress|Fortschritt aktualisieren|進捗を更新|更新进度|Actualizar progreso|Mettre à jour
Target:|Ziel:|目標：|目标：|Objetivo:|Cible :
when you reach it.|wenn du es erreichst.|達成したとき。|达成时。|cuando la alcances.|quand vous l'atteignez.
every day you do it.|an jedem Tag, an dem du es tust.|実行した日ごとに。|每完成一天。|cada día que lo haces.|chaque jour où vous le faites.
every day you don't.|an jedem Tag, an dem du es nicht tust.|実行しなかった日ごとに。|每错过一天。|cada día que no lo haces.|chaque jour où vous ne le faites pas.
↗ Website|↗ Website|↗ ウェブサイト|↗ 网站|↗ Sitio web|↗ Site web
Paid to date|Bisher bezahlt|これまでの入金|累计已付|Pagado hasta la fecha|Payé à ce jour
Project balance|Projektsaldo|プロジェクト残高|项目余额|Saldo del proyecto|Solde du projet
Product & tech|Produkt & Technik|製品と技術|产品与技术|Producto y tecnología|Produit et technique
No product details.|Keine Produktdetails.|製品情報なし。|没有产品详情。|Sin detalles del producto.|Aucun détail produit.
Add them|Hinzufügen|追加する|添加|Añadirlos|Les ajouter
Monthly running costs|Monatliche laufende Kosten|月間運営コスト|每月运营成本|Costes operativos mensuales|Coûts de fonctionnement mensuels
Monthly Running Costs|Monatliche laufende Kosten|月間運営コスト|每月运营成本|Costes operativos mensuales|Coûts de fonctionnement mensuels
Payments · also in Finance|Zahlungen · auch in Finanzen|支払い · 財務にも記録|付款 · 同时记入财务|Pagos · también en Finanzas|Paiements · aussi dans Finances
No retainer set.|Keine Pauschale festgelegt.|月額契約は未設定。|未设置月费。|Sin iguala definida.|Aucun forfait défini.
No notes yet.|Noch keine Notizen.|メモはまだありません。|还没有备注。|Aún no hay notas.|Aucune note pour l'instant.
Move back to the Pipeline|Zurück in die Pipeline|案件に戻す|移回销售管道|Devolver al Embudo|Renvoyer au Pipeline
Delete for good|Endgültig löschen|完全に削除|永久删除|Eliminar definitivamente|Supprimer définitivement
Start from scratch|Von vorn beginnen|最初から始める|从头开始|Empezar de cero|Partir de zéro
Tech Stack & Links|Technik & Links|技術構成とリンク|技术栈与链接|Tecnología y enlaces|Technique et liens
Online Platforms|Online-Plattformen|オンラインプラットフォーム|在线平台|Plataformas en línea|Plateformes en ligne
Add Platform|Plattform hinzufügen|プラットフォームを追加|添加平台|Añadir plataforma|Ajouter une plateforme
Add Cost|Kosten hinzufügen|コストを追加|添加成本|Añadir coste|Ajouter un coût
Credentials & Access|Zugangsdaten & Zugriff|認証情報とアクセス|凭据与访问|Credenciales y acceso|Identifiants et accès
Add Credential|Zugang hinzufügen|認証情報を追加|添加凭据|Añadir credencial|Ajouter un identifiant
Lead search|Lead-Suche|リード検索|线索搜索|Búsqueda de prospectos|Recherche de prospects
Draft message|Nachrichtenentwurf|下書きメッセージ|消息草稿|Borrador de mensaje|Brouillon de message
Draft Message|Nachrichtenentwurf|下書きメッセージ|消息草稿|Borrador de mensaje|Brouillon de message
✓ Approve|✓ Genehmigen|✓ 承認|✓ 批准|✓ Aprobar|✓ Approuver
✕ Reject|✕ Ablehnen|✕ 却下|✕ 拒绝|✕ Rechazar|✕ Refuser
Nothing approved yet|Noch nichts genehmigt|承認済みはまだなし|尚无已批准项|Nada aprobado aún|Rien d'approuvé pour l'instant
How can I help?|Wie kann ich helfen?|何をお手伝いしましょう？|我能帮你什么？|¿En qué puedo ayudar?|Comment puis-je aider ?
Subtotal|Zwischensumme|小計|小计|Subtotal|Sous-total
Description|Beschreibung|内容|描述|Descripción|Description
Add Line|Zeile hinzufügen|行を追加|添加行|Añadir línea|Ajouter une ligne
Add your first venture|Füge dein erstes Unternehmen hinzu|最初の事業を追加|添加你的第一个事业|Añade tu primer negocio|Ajoutez votre première entreprise
Nothing needs you in any venture.|Kein Unternehmen braucht dich gerade.|どの事業も対応不要。|没有事业需要你处理。|Ningún negocio te necesita ahora.|Aucune entreprise n'a besoin de vous.
in today's tasks|in den heutigen Aufgaben|今日のタスクに追加済み|已在今日任务中|en las tareas de hoy|dans les tâches du jour
Back to today|Zurück zu heute|今日に戻る|回到今天|Volver a hoy|Retour à aujourd'hui
Nothing set for this day.|Für diesen Tag ist nichts festgelegt.|この日の予定なし。|这一天没有安排。|Nada fijado para este día.|Rien de fixé pour ce jour.
No steps yet.|Noch keine Schritte.|ステップはまだありません。|还没有步骤。|Aún no hay pasos.|Aucune étape pour l'instant.
Orders today|Bestellungen heute|今日の注文|今日订单|Pedidos de hoy|Commandes du jour
Your cut today|Dein Anteil heute|今日の取り分|你今日的分成|Tu parte de hoy|Votre part du jour
Card payments today|Kartenzahlungen heute|今日のカード決済|今日刷卡付款|Pagos con tarjeta hoy|Paiements par carte du jour
a month|pro Monat|/月|每月|al mes|par mois
this month|diesen Monat|今月|本月|este mes|ce mois-ci
this month · expected|diesen Monat · erwartet|今月 · 見込み|本月 · 预计|este mes · previsto|ce mois-ci · prévu
Reading the project…|Projekt wird gelesen…|プロジェクトを読み込み中…|正在读取项目…|Leyendo el proyecto…|Lecture du projet…
Reading…|Wird gelesen…|読み込み中…|读取中…|Leyendo…|Lecture…
Plan ›|Plan ›|計画 ›|计划 ›|Plan ›|Plan ›
Finance ›|Finanzen ›|財務 ›|财务 ›|Finanzas ›|Finances ›
Uncommitted|Nicht committet|未コミット|未提交|Sin confirmar|Non validé
Clean|Sauber|クリーン|干净|Limpio|Propre
Not pushed|Nicht gepusht|未プッシュ|未推送|Sin subir|Non poussé
Services it depends on|Dienste, von denen es abhängt|依存サービス|所依赖的服务|Servicios de los que depende|Services dont elle dépend
Firebase project|Firebase-Projekt|Firebaseプロジェクト|Firebase项目|Proyecto de Firebase|Projet Firebase
Log · decisions and what happened|Protokoll · Entscheidungen und Ereignisse|ログ · 決定と出来事|日志 · 决定与经过|Registro · decisiones y lo ocurrido|Journal · décisions et événements
Moves · what happens next|Schritte · was als Nächstes passiert|一手 · 次に起こること|步骤 · 接下来做什么|Pasos · lo que sigue|Actions · ce qui vient ensuite
The books · money in and out of this venture|Die Bücher · Geld rein und raus|帳簿 · この事業の入出金|账目 · 此事业的收支|Las cuentas · dinero que entra y sale|Les comptes · entrées et sorties de cette entreprise
nothing logged against it yet|noch nichts dazu erfasst|まだ記録なし|尚无相关记录|aún nada registrado|rien d'enregistré pour l'instant
done so far|bisher erledigt|完了済み|目前已完成|hecho hasta ahora|fait à ce jour
linked to this venture|mit diesem Unternehmen verknüpft|この事業に連携|关联到此事业|vinculado a este negocio|lié à cette entreprise
worked out live|live berechnet|リアルタイム算出|实时计算|calculado en vivo|calculé en direct
Daily check ·|Tagescheck ·|毎日の確認 ·|每日检查 ·|Revisión diaria ·|Contrôle quotidien ·
no streak yet|noch keine Serie|連続記録なし|尚无连续记录|sin racha aún|pas encore de série
Check|Prüfen|確認|检查|Revisar|Vérifier
moves|Schritte|手|步|pasos|actions
Nothing priced yet|Noch nichts bepreist|価格未設定|尚未定价|Nada con precio aún|Rien de chiffré pour l'instant
No focus timers linked yet|Noch keine Fokus-Timer verknüpft|連携した集中タイマーなし|尚未关联专注计时器|Sin temporizadores vinculados aún|Aucun minuteur lié pour l'instant
Food sold|Verkauftes Essen|食品売上|已售餐食|Comida vendida|Repas vendus
delivered orders|gelieferte Bestellungen|配達済み注文|已送达订单|pedidos entregados|commandes livrées
of orders delivered|der Bestellungen geliefert|の注文を配達|的订单已送达|de pedidos entregados|des commandes livrées
Last 14 days|Letzte 14 Tage|過去14日|最近14天|Últimos 14 días|14 derniers jours
Card payments received|Erhaltene Kartenzahlungen|受領カード決済|已收刷卡付款|Pagos con tarjeta recibidos|Paiements par carte reçus
Started, never finished|Begonnen, nie abgeschlossen|開始のみ・未完了|已开始但未完成|Iniciados, nunca terminados|Commencés, jamais terminés
Why orders were cancelled|Warum Bestellungen storniert wurden|注文キャンセルの理由|订单取消原因|Por qué se cancelaron pedidos|Pourquoi des commandes ont été annulées
Latest orders|Letzte Bestellungen|最新の注文|最新订单|Últimos pedidos|Dernières commandes
When|Wann|日時|时间|Cuándo|Quand
Store|Geschäft|店舗|店铺|Tienda|Boutique
No orders in the last 30 days.|Keine Bestellungen in den letzten 30 Tagen.|過去30日間に注文なし。|最近30天没有订单。|Sin pedidos en los últimos 30 días.|Aucune commande ces 30 derniers jours.
Key|Schlüssel|キー|密钥|Clave|Clé
File|Datei|ファイル|文件|Archivo|Fichier
Value|Wert|値|值|Valor|Valeur
Set|Gesetzt|設定済み|已设置|Definida|Définie
Not set|Nicht gesetzt|未設定|未设置|Sin definir|Non définie
Secret files|Geheime Dateien|機密ファイル|机密文件|Archivos secretos|Fichiers secrets
None found.|Keine gefunden.|見つかりません。|未找到。|No se encontró ninguno.|Aucun trouvé.
Hover a key to see what it's for.|Fahre über einen Schlüssel, um seinen Zweck zu sehen.|キーにカーソルを合わせると用途が表示されます。|将鼠标悬停在密钥上查看用途。|Pasa el cursor sobre una clave para ver para qué sirve.|Survolez une clé pour voir à quoi elle sert.
Keys and settings · values never leave this Mac|Schlüssel und Einstellungen · Werte verlassen diesen Mac nie|キーと設定 · 値はこのMacから出ません|密钥与设置 · 值绝不离开这台Mac|Claves y ajustes · los valores nunca salen de este Mac|Clés et réglages · les valeurs ne quittent jamais ce Mac
a month, from what you entered|pro Monat, nach deinen Angaben|月額・入力値より|每月，按你填写的数据|al mes, según lo que introdujiste|par mois, d'après vos saisies
Actually paid this month|Diesen Monat tatsächlich bezahlt|今月の実支払い|本月实际支付|Realmente pagado este mes|Réellement payé ce mois-ci
from bills you logged|aus erfassten Rechnungen|記録した請求より|来自你记录的账单|según las facturas registradas|d'après les factures saisies
bill|Rechnung|件の請求|笔账单|factura|facture
bills|Rechnungen|件の請求|笔账单|facturas|factures
Lowest to highest|Niedrigster bis höchster|最低から最高|从最低到最高|Del mínimo al máximo|Du plus bas au plus haut
Lowest you should expect|Das Mindeste, das zu erwarten ist|想定される最低額|预计最低|Lo mínimo que debes esperar|Le minimum à prévoir
Highest you should expect|Das Höchste, das zu erwarten ist|想定される最高額|预计最高|Lo máximo que debes esperar|Le maximum à prévoir
What drives the high end|Was das obere Ende treibt|上限を押し上げる要因|什么推高了上限|Qué empuja el máximo|Ce qui fait monter le maximum
Live figures · read straight from the providers|Live-Zahlen · direkt von den Anbietern|ライブ数値 · 提供元から直接取得|实时数据 · 直接读取自服务商|Cifras en vivo · leídas directamente de los proveedores|Chiffres en direct · lus chez les fournisseurs
Nothing connected yet|Noch nichts verbunden|未接続|尚未连接|Nada conectado aún|Rien de connecté pour l'instant
Needs a key|Braucht einen Schlüssel|キーが必要|需要密钥|Necesita una clave|Clé requise
Add key|Schlüssel hinzufügen|キーを追加|添加密钥|Añadir clave|Ajouter une clé
Today's rounds · every service, every day|Heutige Runde · jeder Dienst, jeden Tag|今日の巡回 · 全サービスを毎日|今日巡检 · 每项服务，每一天|Ronda de hoy · cada servicio, cada día|Tournée du jour · chaque service, chaque jour
checked|geprüft|確認済み|已检查|revisado|vérifié
Nothing logged|Nichts erfasst|記録なし|没有记录|Nada registrado|Rien d'enregistré
Add a key to see the real figure|Schlüssel hinzufügen, um die echte Zahl zu sehen|実数を見るにはキーを追加|添加密钥以查看真实数字|Añade una clave para ver la cifra real|Ajoutez une clé pour voir le chiffre réel
Stamp as checked today|Als heute geprüft stempeln|本日確認済みの印を押す|盖章：今日已检查|Sellar como revisado hoy|Tamponner comme vérifié aujourd'hui
Bills logged · these are real Finance expenses|Erfasste Rechnungen · echte Finanzausgaben|記録した請求 · 実際の財務支出|已记录账单 · 这些是真实的财务支出|Facturas registradas · son gastos reales de Finanzas|Factures saisies · ce sont de vraies dépenses
People ·|Personen ·|人 ·|人员 ·|Personas ·|Personnes ·
Links ·|Links ·|リンク ·|链接 ·|Enlaces ·|Liens ·
Customer|Kunde|顧客|客户|Cliente|Client
keys|Schlüssel|個のキー|个密钥|claves|clés
not in git|nicht in Git|gitに含まれない|不在git中|fuera de git|hors de git
Safe checks|Sichere Prüfungen|安全なチェック|安全检查|Comprobaciones seguras|Vérifications sûres
Git status|Git-Status|Gitの状態|Git状态|Estado de Git|État de Git
Check for remote changes|Auf entfernte Änderungen prüfen|リモートの変更を確認|检查远程更改|Buscar cambios remotos|Vérifier les changements distants
Dependency audit|Abhängigkeitsprüfung|依存関係の監査|依赖审计|Auditoría de dependencias|Audit des dépendances
Deploys stay in your own terminal, on purpose.|Deployments bleiben bewusst in deinem eigenen Terminal.|デプロイは意図的に自分のターミナルで。|部署特意留在你自己的终端里。|Los despliegues se quedan en tu propia terminal, a propósito.|Les déploiements restent dans votre propre terminal, volontairement.
Output|Ausgabe|出力|输出|Salida|Sortie
Project notes|Projektnotizen|プロジェクトノート|项目笔记|Notas del proyecto|Notes du projet
Pick a note|Notiz wählen|ノートを選択|选择一份笔记|Elige una nota|Choisir une note
Remove venture|Unternehmen entfernen|事業を削除|移除事业|Quitar negocio|Retirer l'entreprise
Remove service|Dienst entfernen|サービスを削除|移除服务|Quitar servicio|Retirer le service
Renews|Verlängert sich|更新日|续费|Renueva|Renouvellement
New Lead|Neuer Lead|新規リード|新线索|Nuevo prospecto|Nouveau prospect
New Habit|Neue Gewohnheit|新しい習慣|新习惯|Nuevo hábito|Nouvelle habitude
New Transaction|Neue Buchung|新規取引|新交易|Nuevo movimiento|Nouvelle transaction
New Goal|Neues Ziel|新しい目標|新目标|Nueva meta|Nouvel objectif
New clients|Neue Kunden|新規顧客|新客户|Clientes nuevos|Nouveaux clients
Focus hours|Fokusstunden|集中時間|专注小时|Horas de enfoque|Heures de focus
Other number|Andere Zahl|その他の数値|其他数字|Otro número|Autre chiffre
Delete Lead|Lead löschen|リードを削除|删除线索|Eliminar prospecto|Supprimer le prospect
Every week|Jede Woche|毎週|每周|Cada semana|Chaque semaine
Every 2 weeks|Alle 2 Wochen|隔週|每两周|Cada 2 semanas|Toutes les 2 semaines
One time|Einmalig|1回のみ|一次|Una vez|Une fois
One-time|Einmalig|単発|一次性|Único|Ponctuel
Every month|Jeden Monat|毎月|每月|Cada mes|Chaque mois
Every year|Jedes Jahr|毎年|每年|Cada año|Chaque année
Depends on use|Nach Nutzung|使用量による|按用量|Según el uso|Selon l'usage
Free|Kostenlos|無料|免费|Gratis|Gratuit
Date range|Zeitraum|期間|日期范围|Rango de fechas|Période
Unmark|Markierung entfernen|印を外す|取消标记|Desmarcar|Décocher
Business Name|Firmenname|事業名|企业名称|Nombre del negocio|Nom de l'entreprise
Business name|Firmenname|事業名|企业名称|Nombre del negocio|Nom de l'entreprise
Size|Größe|規模|规模|Tamaño|Taille
Contact Name|Kontaktname|担当者名|联系人姓名|Nombre de contacto|Nom du contact
Contact person|Ansprechpartner|担当者|联系人|Persona de contacto|Interlocuteur
Next Action|Nächste Aktion|次のアクション|下一步行动|Próxima acción|Prochaine action
JAXON Draft Message|JAXON-Nachrichtenentwurf|JAXONの下書き|JAXON消息草稿|Borrador de JAXON|Brouillon de JAXON
Payment Stage|Zahlungsphase|支払い段階|付款阶段|Etapa de pago|Étape de paiement
Task|Aufgabe|タスク|任务|Tarea|Tâche
What are you working on?|Woran arbeitest du?|何に取り組む？|你在做什么？|¿En qué estás trabajando?|Sur quoi travaillez-vous ?
Brew in the hourglass|Gebräu im Stundenglas|砂時計の中身|沙漏里的药剂|Brebaje del reloj de arena|Breuvage du sablier
Course code|Kurscode|科目コード|课程代码|Código del curso|Code du cours
Credits (optional)|Credits (optional)|単位（任意）|学分（可选）|Créditos (opcional)|Crédits (facultatif)
Course title|Kurstitel|科目名|课程名称|Título del curso|Intitulé du cours
Term started|Semesterbeginn|学期開始|学期开始|Inicio del trimestre|Début du semestre
Exam date|Prüfungsdatum|試験日|考试日期|Fecha del examen|Date d'examen
Title|Titel|タイトル|标题|Título|Titre
Calendar|Kalender|カレンダー|日历|Calendario|Calendrier
Starts|Beginnt|開始|开始|Empieza|Début
Ends|Endet|終了|结束|Termina|Fin
Repeats|Wiederholt sich|繰り返し|重复|Se repite|Répétition
Until (optional)|Bis (optional)|終了日（任意）|直到（可选）|Hasta (opcional)|Jusqu'au (facultatif)
Tag|Etikett|タグ|标签|Etiqueta|Étiquette
What for?|Wofür?|何のため？|用于什么？|¿Para qué?|Pour quoi ?
What was it for?|Wofür war es?|何のため？|用于什么？|¿Para qué fue?|C'était pour quoi ?
Started on|Begonnen am|開始日|开始于|Empezó el|Commencé le
Started on (optional)|Begonnen am (optional)|開始日（任意）|开始于（可选）|Empezó el (opcional)|Commencé le (facultatif)
From client (optional)|Vom Kunden (optional)|顧客から（任意）|来自客户（可选）|Del cliente (opcional)|Du client (facultatif)
Venture this belongs to (optional)|Zugehöriges Unternehmen (optional)|属する事業（任意）|所属事业（可选）|Negocio al que pertenece (opcional)|Entreprise concernée (facultatif)
Why it matters (optional)|Warum es wichtig ist (optional)|なぜ大事か（任意）|为什么重要（可选）|Por qué importa (opcional)|Pourquoi c'est important (facultatif)
Area of life|Lebensbereich|生活の領域|生活领域|Área de la vida|Domaine de vie
What kind of goal?|Welche Art von Ziel?|どんな目標？|哪种目标？|¿Qué tipo de meta?|Quel type d'objectif ?
Unit|Einheit|単位|单位|Unidad|Unité
Count from|Zählen ab|起算日|起算自|Contar desde|Compter à partir de
When did you do it?|Wann hast du es getan?|いつ達成した？|你什么时候完成的？|¿Cuándo lo hiciste?|Quand l'avez-vous fait ?
I've already done this. Put it on my record.|Das habe ich schon geschafft. Trag es ein.|すでに達成済み。記録に残す。|我已经做到了。记入我的记录。|Ya lo hice. Añádelo a mi historial.|C'est déjà fait. Ajoutez-le à mon palmarès.
Name the goal.|Benenne das Ziel.|目標に名前を付けよう。|给目标起个名字。|Ponle nombre a la meta.|Nommez l'objectif.
Phone / WhatsApp|Telefon / WhatsApp|電話 / WhatsApp|电话 / WhatsApp|Teléfono / WhatsApp|Téléphone / WhatsApp
Business type|Geschäftsart|業種|业务类型|Tipo de negocio|Type d'activité
Client since|Kunde seit|取引開始|成为客户时间|Cliente desde|Client depuis
Retainer due on day|Pauschale fällig am Tag|月額の支払日|月费到期日|Iguala vence el día|Forfait dû le
Product Type|Produkttyp|製品タイプ|产品类型|Tipo de producto|Type de produit
Due Date|Fälligkeitsdatum|期日|到期日|Fecha de vencimiento|Date d'échéance
Client Name|Kundenname|顧客名|客户名称|Nombre del cliente|Nom du client
What it is, in one line|Was es ist, in einer Zeile|ひとことで言うと|一句话说明|Qué es, en una línea|Ce que c'est, en une ligne
Launch date (optional)|Startdatum (optional)|ローンチ日（任意）|上线日期（可选）|Fecha de lanzamiento (opcional)|Date de lancement (facultatif)
Run-up starts|Vorlauf beginnt|準備開始|筹备开始|Empieza la preparación|Début de la préparation
By when (optional)|Bis wann (optional)|いつまでに（任意）|截止时间（可选）|Para cuándo (opcional)|Pour quand (facultatif)
Launch phase|Startphase|ローンチ段階|上线阶段|Fase de lanzamiento|Phase de lancement
Role|Rolle|役割|角色|Rol|Rôle
Phone or email|Telefon oder E-Mail|電話またはメール|电话或邮箱|Teléfono o correo|Téléphone ou e-mail
Terms (optional)|Konditionen (optional)|条件（任意）|条款（可选）|Condiciones (opcional)|Conditions (facultatif)
What it does for the business|Was es für das Geschäft leistet|事業での役割|它为业务做什么|Qué hace por el negocio|Ce que cela apporte à l'activité
Dashboard link|Dashboard-Link|ダッシュボードのリンク|控制台链接|Enlace al panel|Lien du tableau de bord
How it charges|Abrechnungsart|課金方式|计费方式|Cómo cobra|Mode de facturation
Next bill / renewal|Nächste Rechnung / Verlängerung|次回請求 / 更新|下次账单 / 续费|Próxima factura / renovación|Prochaine facture / renouvellement
Paste the key|Schlüssel einfügen|キーを貼り付け|粘贴密钥|Pega la clave|Collez la clé
Date charged|Abbuchungsdatum|請求日|扣费日期|Fecha del cargo|Date du prélèvement
Finance category|Finanzkategorie|財務カテゴリ|财务类别|Categoría de Finanzas|Catégorie Finances
Retainers|Pauschalen|月額契約|月费|Igualas|Forfaits
Amount|Betrag|金額|金额|Importe|Montant
Search businesses...|Unternehmen suchen...|事業を検索...|搜索企业...|Buscar negocios...|Rechercher des entreprises...
Search all transactions…|Alle Buchungen durchsuchen…|すべての取引を検索…|搜索所有交易…|Buscar en todos los movimientos…|Rechercher dans les transactions…
Search clients…|Kunden suchen…|顧客を検索…|搜索客户…|Buscar clientes…|Rechercher des clients…
Add a unit…|Einheit hinzufügen…|単元を追加…|添加单元…|Añadir unidad…|Ajouter une unité…
Add a step…|Schritt hinzufügen…|ステップを追加…|添加步骤…|Añadir paso…|Ajouter une étape…
No limit|Kein Limit|上限なし|无上限|Sin límite|Sans limite
One business win today…|Ein geschäftlicher Erfolg heute…|今日の仕事の成果をひとつ…|今天的一个事业成果…|Un logro de negocio hoy…|Une victoire pro aujourd'hui…
One personal win today…|Ein persönlicher Erfolg heute…|今日の個人的な成果をひとつ…|今天的一个个人成果…|Un logro personal hoy…|Une victoire perso aujourd'hui…
One thing to hit tomorrow…|Eine Sache für morgen…|明日やり遂げることをひとつ…|明天要完成的一件事…|Una cosa para lograr mañana…|Une chose à réussir demain…
Command bar (⌘K)|Befehlsleiste (⌘K)|コマンドバー (⌘K)|命令栏 (⌘K)|Barra de comandos (⌘K)|Barre de commandes (⌘K)
Interface language|Sprache der Oberfläche|表示言語|界面语言|Idioma de la interfaz|Langue de l'interface
New|Neu|新規|新|Nuevo|Nouveau
Contacted|Kontaktiert|連絡済み|已联系|Contactado|Contacté
Demo Sent|Demo gesendet|デモ送付済み|已发演示|Demo enviada|Démo envoyée
Negotiating|In Verhandlung|交渉中|谈判中|Negociando|En négociation
Paid|Bezahlt|支払い済み|已付款|Pagado|Payé
Flaked|Abgesprungen|音信不通|失联|Desapareció|Sans suite
Lost|Verloren|失注|丢失|Perdido|Perdu
First Deposit|Erste Anzahlung|初回入金|首笔定金|Primer depósito|Premier acompte
Second Deposit|Zweite Anzahlung|2回目入金|第二笔定金|Segundo depósito|Deuxième acompte
Completion Fee|Abschlusshonorar|完了報酬|完工费|Pago final|Solde à la livraison
Monthly Retainer|Monatspauschale|月額契約料|月费|Iguala mensual|Forfait mensuel
Restaurant|Restaurant|飲食店|餐厅|Restaurante|Restaurant
Retail|Einzelhandel|小売|零售|Comercio|Commerce de détail
Pharmacy|Apotheke|薬局|药店|Farmacia|Pharmacie
Salon|Salon|サロン|美容院|Salón|Salon
Mechanic|Werkstatt|整備工場|修车行|Taller mecánico|Garage
Wholesale|Großhandel|卸売|批发|Mayorista|Grossiste
Real Estate|Immobilien|不動産|房地产|Inmobiliaria|Immobilier
Bakery|Bäckerei|ベーカリー|面包店|Panadería|Boulangerie
Church|Kirche|教会|教堂|Iglesia|Église
Hotel|Hotel|ホテル|酒店|Hotel|Hôtel
Setup Value (J$)|Einrichtungswert (J$)|初期費用 (J$)|搭建费用 (J$)|Valor de instalación (J$)|Valeur d'installation (J$)
Retainer/mo (J$)|Pauschale/Monat (J$)|月額 (J$)|月费 (J$)|Iguala/mes (J$)|Forfait/mois (J$)
Follow up call|Nachfassanruf|フォローの電話|跟进电话|Llamada de seguimiento|Appel de relance
`;

const DICT = Object.fromEntries(ORDER.map(l => [l, new Map()]));
ROWS.trim().split('\n').forEach(row => {
  const [en, ...rest] = row.split('|');
  ORDER.forEach((l, i) => { if (rest[i]) DICT[l].set(en, rest[i]); });
});

// Phrases with a number or a name in them
const GREET = {
  de: ['Guten Morgen', 'Guten Tag', 'Guten Abend'], ja: ['おはよう', 'こんにちは', 'こんばんは'], zh: ['早上好', '下午好', '晚上好'],
  es: ['Buenos días', 'Buenas tardes', 'Buenas noches'], fr: ['Bonjour', 'Bon après-midi', 'Bonsoir'],
};
const PATTERNS = [
  [/^Good (morning|afternoon|evening), (.+)\.$/, (m, l) => { const g = GREET[l][['morning', 'afternoon', 'evening'].indexOf(m[1])]; return l === 'ja' ? `${g}、${m[2]}。` : l === 'zh' ? `${m[2]}，${g}。` : `${g}, ${m[2]}.`; }],
  [/^Level (\d+)$/, (m, l) => ({ de: `Level ${m[1]}`, ja: `レベル ${m[1]}`, zh: `等级 ${m[1]}`, es: `Nivel ${m[1]}`, fr: `Niveau ${m[1]}` }[l])],
  [/^(\d+) days?$/, (m, l) => ({ de: `${m[1]} ${m[1] === '1' ? 'Tag' : 'Tage'}`, ja: `${m[1]}日`, zh: `${m[1]}天`, es: `${m[1]} ${m[1] === '1' ? 'día' : 'días'}`, fr: `${m[1]} ${m[1] === '1' ? 'jour' : 'jours'}` }[l])],
  [/^tomorrow$/, (m, l) => ({ de: 'morgen', ja: '明日', zh: '明天', es: 'mañana', fr: 'demain' }[l])],
  [/^today$/, (m, l) => ({ de: 'heute', ja: '今日', zh: '今天', es: 'hoy', fr: "aujourd'hui" }[l])],
];

function lookup(text, lang) {
  if (lang === 'en' || !DICT[lang]) return text;
  const core = text.trim();
  if (!core) return text;
  let out = DICT[lang].get(core);
  if (out === undefined) { for (const [re, fn] of PATTERNS) { const m = core.match(re); if (m) { out = fn(m, lang); break; } } }
  return out === undefined ? text : text.replace(core, out);
}

// ── Applying it to the page ──────────────────────────────────────────────────
// React keeps writing English. Each text node remembers the English it was
// given, so switching language (or back to English) always starts from the
// source. Only text is replaced; the page structure is never touched.
const SEEN = new WeakMap();      // text node -> { src, out }
const SEEN_ATTR = new WeakMap(); // element -> { placeholder: { src, out }, title: ... }
const ATTRS = ['placeholder', 'title'];
const SKIP = 'script, style, textarea, pre, code, body [lang="ja"], .vt-term, .vt-doc, .mono, [data-no-i18n]';
let current = 'en';

function doText(node) {
  const el = node.parentElement;
  if (!el || el.closest(SKIP)) return;
  const now = node.nodeValue, rec = SEEN.get(node);
  const src = rec && rec.out === now ? rec.src : now;        // if it differs, React wrote something new
  const out = lookup(src, current);
  SEEN.set(node, { src, out });
  // A dropdown choice with no value of its own saves its visible text, so pin
  // the English before changing what it shows. Saved data stays in English.
  if (el.tagName === 'OPTION' && !el.hasAttribute('value')) el.setAttribute('value', src);
  if (out !== now) node.nodeValue = out;
}
function doAttrs(el) {
  if (el.closest(SKIP)) return;
  ATTRS.forEach(a => {
    if (!el.hasAttribute(a)) return;
    const now = el.getAttribute(a), all = SEEN_ATTR.get(el) || {}, rec = all[a];
    const src = rec && rec.out === now ? rec.src : now;
    const out = lookup(src, current);
    all[a] = { src, out }; SEEN_ATTR.set(el, all);
    if (out !== now) el.setAttribute(a, out);
  });
}
function walk(root) {
  if (root.nodeType === 3) { doText(root); return; }
  if (root.nodeType !== 1) return;
  doAttrs(root);
  root.querySelectorAll('[placeholder], [title]').forEach(doAttrs);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) doText(n);
}

let observer = null;
export function setLanguage(lang) {
  current = LANGS.some(l => l.id === lang) ? lang : 'en';
  document.documentElement.lang = current;
  if (!observer) {
    observer = new MutationObserver(list => list.forEach(m => {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
      else m.addedNodes.forEach(walk);
    }));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  walk(document.body);
}
export const localeOf = lang => (LANGS.find(l => l.id === lang) || LANGS[0]).locale;
export const phraseCount = ROWS.trim().split('\n').length;
