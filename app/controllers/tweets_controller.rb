class TweetsController < ApplicationController

  def index
    @tweet = Tweet.new
    @tweets = Tweet.includes(:user)
  end
  
  def new
    @tweet = Tweet.new
  end

  def create
    @tweet = Tweet.create(post_params)
    if @tweet.save
    redirect_to root_path, notice: "messageをそうしんしたよ" 
    else
      @tweets = @tweet.includes(:user)
      flash.now[:alert] = 'メッセージを入力してね'
      render :index
    end
  end

  def show
    post = Tweet.find(params[:id])
    @tweets = Tweet.includes(:user)
  end

  private

  def post_params
    params.require(:tweet).permit(:title, :text, :image, :file).merge(user_id: current_user.id)
  end

end
