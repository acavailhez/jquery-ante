jQuery Ante (jquery-ante)
=============

jQuery Ante is a library made to plug events to be trigger before any event bound to a DOM element with `$().on()`

Quick example
-------------

You have a button which will display a modal, but the modal content is not yet in the DOM and needs to be fetched through an api call

```html
<a id="show-modal-button">Show the modal</a>
```

```javascript

//show the modal on click
$('#show-modal-button').on('click',function(){
	$('#modal').modal('show');
});

//before showing the modal, fetch the modal content with an api call
$('#show-modal-button').ante('click',function(){
	return $.ajax({
		url:'/modal-content',
		dataType:'html',
		success:function(html){
			$('body').append(html);
			//now the content of the modal is in the DOM and can be shown
		}
	});
});
```

When clicking the button, the ajax call will be made and the page will wait for the html to be added to the DOM before displaying the modal