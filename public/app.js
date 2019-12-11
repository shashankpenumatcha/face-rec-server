(function(){
    var file =null;
    $('#process').click(function(){
        process();
    });
    $("#file").change(function(e) {
        file=e.target.files[0];
        displayFile(file,null);
    });
    function displayFile(input,url) {
        if (input) {
            var reader = new FileReader();
            reader.onload = function (e) {
                $('#image')
                    .attr('src', e.target.result)
            };
            reader.readAsDataURL(input);
        }else if(url){
            $('#image')
                .attr('src', url)
        }
    }
    function process(){
        $('#process').css('visibility','hidden')
      if(file){
        var fd  = new FormData();
        fd.append('avatar',file);
        $.ajax({
            url: '/process',
            data: fd,
            type: 'POST',
            contentType: false, 
            processData: false,
            success:function(res){
               $('#process').css('visibility','visible')
               let url = 'data:image/jpg;base64,' + res;
               displayFile(null,url)
            },
            error:function(err){
                $('#process').css('visibility','visible')
                console.log(err);
            }
        });
      }
        
    }
})();