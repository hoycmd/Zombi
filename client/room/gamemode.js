import { DisplayValueHeader } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Map, Properties, GameMode, Spawns, Timers, TeamsBalancer, NewGame, NewGameVote, contextedProperties } from 'pixel_combats/room';

// константы
const WaitingPlayersTime = 10;
const DefBaseFromZombiesTime = 50;
const GameModeTime = 300;
const End0fMatchTime = 5;
const KILL_SCORES = 15;
const WINNER_SCORES = 35;
const TIMER_SCORES = 5;
const SCORES_TIMER_INTERVAL = 25;

// имена используемых объектов 
const WaitingStateValue = "Waiting";
const DefBaseStateValue = "DefBase";
const GameStateValue = "Game";
const End0fMatchStateValue = "End0fMatch";
const immortlityTimerName = "immortlity";
const KILLS_PROP_NAME = "Kills";
const SCORES_PROP_NAME = "Scores";
const gamemodeParameters = GameMode.Parameters;

// получаем объекты, с которыми работает режим
const mainTimer = Timers.GetContext().Get("Main");
const stateProp = Properties.GetContext().Get("State");
const scoresTimer = Timers.GetContext().Get(SCORES_PROP_NAME);

// применяем параметры конструктора режима
const MAP_ROTATION = gamemodeParameters.GetBool("MapRotation");
Damage.GetContext().FriendlyFire.Value = gamemodeParameters.GetBool("FriendlyFire");
BreackGraph.OnlyPlayerBlocksDmg = gamemodeParameters.GetBool("PartialDesruction");
BreackGraph.WeakBlocks = gamemodeParameters.GetBool("LoosenBlocks");
Map.Rotation = MAP_ROTATION;

// опции
Properties.GetContext().GameModeName.Value = "GameModes/Team Dead Match";
TeamsBalancer.IsAutoBalance = true;
Ui.GetContext().MainTimerId.Value = mainTimer.Id;
// создаем стандартные команды
const blueTeam = default_teams.CreateNewArea("Blue", "\nЛюди", new Color(0, 0, 125/255, 0), 1, BuildBlocksSet.Blue);
const zombieTeam = default_teams.CreateNewArea("Red", "\nЗомби", new Color(0, 125/255, 0, 0), 1, BuildBlocksSet.Red);
blueTeam.contextedProperties.StartBlocksCount.Value = 61;
blueTeam.contextedProperties.BuildSpeed.Value = 1;
zombieTeam.Spawns.RespawnTime.Value = 10;
zombieTeam.contextedProperties.InventoryType.Value = true;
zombieTeam.contextedProperties.SkinType.Value = 1;
zombieTeam.contextedProperties.StartBlocksCount.Value = 31;
zombieTeam.contextedProperties.BuildSpeed.Value = 3;

// настраиваем параметры, которые нужно выводить в лидерборде
LeaberBoard.PlayerLeaberBoardValues = [
 new DisplayValueHeader(KILLS_PROP_NAME, "<b>K</b>", "<b>K</b>"),
 new DisplayValueHeader("Deaths", "<b>D</b>", "<b>D</b>"),
 new DisplayValueHeader(SCORES_PROP_NAME, "<b>S</b>", "<b>S</b>"),
 new DisplayValueHeader("Spawns", "<b>S</b>", "<b>S</b>")
];
LeaberBoard.TeamLeaberBoardValue = new DisplayValueHeader(SCORES_PROP_NAME, "<b>S</b>", "<b>S</b>");
// задаем сортировку команд для списка лидирующих
LeaberBoard.TeamWeightGetter.Set(function(team) {
 return team.Properties.Get(SCORES_PROP_NAME).Value;
});
// задаем сортировку игроков для списка лидирующих
LeaberBoard.PlayersWeightGetter.Set(function(player) {
 return player.Properties.Get(SCORES_PROP_NAME);
});

// отображаем значения в табе
Ui.GetContext().TeamProp1.Value = { Team: "Blue", Prop: SCORES_PROP_NAME };
Ui.GetContext().TeamProp2.Value = { Team: "Red", Prop: SCORES_PROP_NAME };

// при запросе смены команды игрока - добавляем его в запрашиваемую команду
Teams.OnRequestJoinTeam.Add(function (player, team) { team.Add(player); });
// при запросе спавна игрока - спавним его
Teams.OnPlayerChangeTeam.Add(function (player) { player.Spawns.Spawn() });

// бессмертие после респавна
Spawns.GetContext().OnSpawn.Add(function(player) {
 player.Properties.Immortality.Value = true;
 player.Timers.Get(immortalityTimerName).Restart(7);
});
Timers.OnPlayerTimer.Add(function(timer) {
 if (timer.Id != immortalityTimerName) timer.Player.Properties.Immortality.Value = false;
});

// обработчик спавнов
Spawns.OnSpawn.Add(function(player) {
 ++player.Properties.Spawns.Value;
});

// обработчик смертей
Damage.OnDeath.Add(function(player) {
 if (blueTeam.Properties.Deaths.Value == 1) {
   zombieTeam.Add(player);
  return;
 }
 ++player.Properties.Deaths.Value;
});

// обработчик убийств
Damage.OnKill.Add(function(player, killed) {
 if (player.id !== killed.id) ++player.Properties.Kills.Value;
  player.Properties.Scores.Value += KILL_SCORES;
});

// таймер очков за проведенное время
scoresTimer.OnTimer.Add(function() {
 for (const player of Players.All) {
		if (player.Team == null) continue; 
		player.Properties.Scores.Value += TIMER_SCORES;
	}
});

// таймер переключения состояний
mainTimer.OnTimer.Add(function () {
	switch (stateProp.Value) {
		case WaitingStateValue:
			SetBuildMode();
			break;
		case DefBaseStateValue:
			SetGameMode();
			break;
		case GameModeStateValue:
			SetEnd_End0fMatch();
			break;
		case End0fMatchStateValue:
			start_vote();
			break;
	}
});

// изначально задаем состояние ожидание других игроков 
SetWaitingMode();

// состояние игры
function SetWaitingMode() {
 stateProp.Value = WaitingStateValue;
 Ui.GetContext().Hint.Value = "Ожидание, всех - игроков...";
 Spawns.GetContext().Enable = false;
 mainTimer.Restart(WaitingPlayersTime);
}
function SetDefBase() {
 stateProp.Value = DefBaseStateValue;
 zombieTeam.Ui.Hint.Value = "Выжившие, готовятся к атаке!";
 blueTeam.Ui.Hint.Value = "Застраивайте базу, от зараженных!";

 // set blueTeam
 var inventory = Inventory.GetContext(blueTeam);
 inventory.Main.Value = false;
 inventory.Secondary.Value = false;
 inventory.Melee.Value = true;
 inventory.Explosive.Value = false;
 inventory.Build.Value = true;
 inventory.BuildInfinity.Value = true;

 // set zombiTeam
 var inventory = Inventory.GetContext(zombieTeam);
 inventory.Main.Value = false;
 inventory.Secondary.Value = false;
 inventory.Melee.Value = false;
 inventory.Explosive.Value = false;
 inventory.Build.Value = false;
 inventory.BuildInfinity.Value = false;
 // урон разрешен 
 Damage.GetContext().DamageOut.Value = true;

 Spawns.GetContext().Enable = true;
 mainTimer.Restart(DefBaseFromZombiesTime);
 SpawnTeams();
}
function SetGameMode() {
 stateProp.Value = GameModeStateValue;
 zombieTeam.Ui.Hint.Value = "Заразите, всех - выживших!";
 blueTeam.Ui.Hint.Value = "Защищайтесь, от зараженных!";

 // set blueTeam
 var inventory = Inventory.GetContext(blueTeam);
 inventory.Main.Value = true;
 inventory.Secondary.Value = true;
 inventory.Melee.Value = true;
 inventory.Explosive.Value = true;
 inventory.Build.Value = true;
 inventory.BuildInfinity.Value = false;

 // set zombiTeam
 var inventory = Inventory.GetContext(zombieTeam);
 inventory.Main.Value = false;
 inventory.Secondary.Value = false;
 inventory.Melee.Value = true;
 inventory.Explosive.Value = true;
 inventory.Build.Value = true;
 inventory.BuildInfinity.Value = false;

 Spawns.GetContext().Despawn();
 mainTimer.Restart(GameModeTime);
 SpawnsTeams();
}
function End_End0fMatch() {
 





                        
