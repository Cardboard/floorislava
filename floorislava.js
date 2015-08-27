// 
var TILESIZE = 64
var MAP_HEIGHT = 7;
var MAP_WIDTH = 10;
var TILES = [
    [
    '#', true, false, // tile symbol, moveable, rotatable
    [0,0,1,0]], // blocked at [ right, top, left, down ]
]
var move_timer = 0;
var rot_timer = 0;
var move_timer_time = 10;
var rot_timer_time = 10;
var player = [0, 3, 0]; // [x, y, direction]
var map;
var level_0 = [ [4, 0], //[ (end_x, end_y), [objects], [directions] ] 
[
    '    #     ',
    '    #     ',
    '    #     ',
    '### #     ',
    '          ',
    '          ',
    '          '], 
[
    '    0     ',
    '    0     ',
    '    0     ',
    '131 0     ',
    '          ',
    '          ',
    '          ']
]

// images
var img_player;
var img_movchair;

// audio

// FUNCTIONS //


// draw everything to the screen
function draw() {
    // BG
    clear_to_color(canvas,makecol(255,85, 85));

    // TILES
    // iterate over all tiles and draw them
    // j=y, i=x
    for (var j = 0; j < MAP_HEIGHT; j++) {
        for (var i = 0; i < MAP_WIDTH; i++) {
            if (map[1][j][i] == '#') {
                rotate_sprite(canvas, img_movchair, 
                              coord2pos(i), coord2pos(j),
                              int2dir(map[2][j][i]));
            }
        }
    }

    // PLAYER
    rotate_sprite(canvas, img_player,
                  coord2pos(player[0]), coord2pos(player[1]),
                  int2dir(player[2]));
}
    
// handle keypresses and updating the game's state
function update() {
    if (key[KEY_RIGHT] && move_timer === 0) {
        if (player[2] === 0) {
            move(0, 1);
        }
        player[2] = 0;
        set_move_timer();
    }
    if (key[KEY_LEFT] && move_timer === 0) {
        if (player[2] === 2) {
            move(2, 1);
        }
        player[2] = 2;
        set_move_timer();
    }
    if (key[KEY_UP] && move_timer === 0) {
        if (player[2] === 1) {
            move(1, 1);
        }
        player[2] = 1;
        set_move_timer();
    }
    if (key[KEY_DOWN] && move_timer === 0) {
        if (player[2] === 3) {
            move(3, 1);
        }
        player[2] = 3;
        set_move_timer();
    }
    // update the timers
    if (move_timer !== 0) move_timer -= 1;
    if (rot_timer !== 0) rot_timer -= 1;

}

// move a player to a new coordinate
function move(dir, dist) {
    var x = player[0];
    var y = player[1];
    // set default distance to 1
    mode = typeof mode !== 'undefined' ? mode : 1;
    // adjust position based on distance to be moved
    if (dir == 0) x+=dist;
    if (dir == 1) y+=dist;
    if (dir == 2) x-=dist;
    if (dir == 3) y-=dist;
    // check that the move is possible
    if (check_move(x, y, dir)) {
       // console.log('Player moved from (' + player[0] + ', ' + player[1] +
       //         ') to (' + x + ', ' + y + ')');
        player[0] = x;
        player[1] = y;
    }
    //set_move_timer();

}

// check if a player's intended move is possible
// return true if the movement is possible
function check_move(newx, newy, dir) {
    if (map[1][newy][newx] === ' ') {
        console.log("LAVA LAVA LAVA");
        return false;
    }
    if ( !(is_blocked(newx, newy, (dir + 2) % 4)) ) {
        return true;
    }
    console.log("direction IS blocked");
    return false;
}

// check if tile has a barrier on a given side
function is_blocked(x, y, side) {
    // if the map ends in either direction blocked
    if (player[0] === 0 && side === 0) return true;
    if (player[0] === MAP_WIDTH && side === 2) return true;
    if (player[1] === 0 && side === 1) return true;
    if (player[1] === MAP_HEIGHT && side === 3) return true;
    // get tile info from the map 
    var tile_type = map[1][y][x];
    var tile_dir = map[2][y][x];
    // search the tiles list for the tile we are checking
    // in order to get the locations of the tile's barriers
    for (k=0; k<TILES.length; k++) {
        if (tile_type === TILES[k][0]) {
            tile = TILES[k][3];
        }
    }
    var tile_rotated = [0,0,0,0];
    tile_rotated[0] = tile[Math.abs((0-tile_dir)%4)];
    tile_rotated[1] = tile[Math.abs((1-tile_dir)%4)];
    tile_rotated[2] = tile[Math.abs((2-tile_dir)%4)];
    tile_rotated[3] = tile[Math.abs((3-tile_dir)%4)];

    // return true if the tile has a barrier on the side
    // the player wishes to move into
    return (tile_rotated[side] == 1);
}

// sets the players move timer to its default value
function set_move_timer() {
    move_timer = move_timer_time;
}

// sets the players rotate timer to its default value
function set_rot_timer() {
    rot_timer = rot_timer_time;
}

// convert an int to a direction, in degrees
// 0: right, 1: up, 2: left, 3: down
function int2dir (i) {
    dir = i * 90;
    return dir;
}

// convert a coordinate to a canvas position
function coord2pos(coord) {
    var pos;
    pos = coord * TILESIZE + TILESIZE/2;
    return pos;
}

// convert a canvas position to a coordinate
function pos2coord(pos) {
    var coord;
    coord = Math.floor(pos / 64);
    return coord;
}

// main
function main() {
    enable_debug('debug');
    allegro_init_all("canvas", MAP_WIDTH * TILESIZE, MAP_HEIGHT * TILESIZE);
    // load stuff
    img_player = load_bmp("data/player.png");
    img_movchair = load_bmp("data/movchair.png");
    // set level
    map = level_0;
    //
    ready(function() {
        loop(function() {
            update();
            draw();
        }, BPS_TO_TIMER(60));
    });
    return 0;
}
END_OF_MAIN();
