function getForegroundColor() {
    return app.foregroundColor.rgb.hexValue;
}


function LogIt( inMessage ) {
    try {
        var a = new Logger();
        var b = decodeURIComponent( inMessage );
        a.log( b + "\n");
    }
    catch(e) {
        alert("LogIt catch : " + e + ":" + e.line);
    }
}

///////////////////////////////////////////////////////////////////////////////
// Object: Logger
// Usage: Log information to a text file
// Input: String to full path of file to create or append, if no file is given
//        then output file Logger.log is created on the users desktop
// Return: Logger object
// Example:
//
//   var a = new Logger();
//   a.print( 'hello' );
//   a.print( 'hello2\n\n\nHi\n' ) ;
//   a.remove();
//   a.log( Date() );
//   a.print( Date() );
//   a.display();
//
///////////////////////////////////////////////////////////////////////////////
function Logger( inFile ) {

    // member properties

    // the file we are currently logging to
    if ( undefined == inFile ) {
        this.file = new File( Folder.desktop + "/PhotoshopEvents.log" );
    } else {
        this.file = new File( inFile );
    }

    // member methods

    // write out a message to the log file
    this.log = function( inMessage ) {
        if ( this.file.exists ) {
            this.file.open( 'e' );
            this.file.seek( 0, 2 ); // end of file
        } else {
            this.file.open( 'w' );
        }
        this.file.write( inMessage );
        this.file.close();
    }

    // show the contents with the execute method
    this.display = function() {
        this.file.execute();
    }

    // remove the file
    this.remove = function() {
        this.file.remove();
    }
}

// end ps.jsx
